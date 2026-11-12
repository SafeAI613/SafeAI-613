import { getFullProfileById } from "../repositories/profileRepository";
import { decryptSecret } from "../utils/crypto";
import {
  getProviderKeyByUserAndProvider,
  getSystemProviderKey,
} from "../repositories/providerKeyRepository";
import { logUsage } from "./usageTracker";
import { isProviderKeyFree } from "../middleware/rateLimiter";
import {
  calculateCostFromTokens,
  calculateImageCost,
  calculateTTSCost,
} from "../utils/costs";
import logger from "../logger";
import { buildSystemPrompt } from "./promptBuilder";
import { evaluateInput, FilterProfile, reasonCode } from "./filter/inputFilter";
import { buildBlockedResponse } from "./filter/blockedResponse";
import { extractFilterText, FilterApi } from "./filter/extractFilterText";
import { RequestTrace } from "./trace/requestTrace";
import { extractAnswer } from "./trace/answerExtractor";
/**
 * מזהה provider מתוך model
 */
function getProviderFromModel(model: string): string {
  // אם יש prefix → הכי אמין
  if (model.includes("/")) {
    return model.split("/")[0] || "unknown";
  }

  const lower = model.toLowerCase();

  if (lower.startsWith("gpt") || lower.startsWith("o3")) return "openai";
  if (lower.startsWith("claude")) return "anthropic";
  if (lower.startsWith("gemini")) return "google";
  if (
    lower.startsWith("llama") ||
    lower.startsWith("groq") ||
    lower.startsWith("qwen")
  )
    return "groq";

  if (
    lower.startsWith("dall-e") ||
    lower.startsWith("tts") ||
    lower.startsWith("whisper")
  )
    return "openai";

  throw new Error(`Unsupported model: ${model}`);
}

/**
 * נורמליזציה של שם המודל - מוסיף prefix של provider אם חסר
 */
function normalizeModelName(model: string, provider: string): string {
  // אם כבר יש prefix, החזר כמו שזה
  if (model.includes("/")) {
    return model;
  }

  // אחרת, הוסף את ה-provider כ-prefix
  return `${provider}/${model}`;
}

function getLiteLLMCost(response: Response, data?: any): number | undefined {
  // 1. הכי אמין - headers של LiteLLM
  const headerCost =
    response.headers.get("x-litellm-response-cost-original") ||
    response.headers.get("x-litellm-response-cost");

  if (headerCost) {
    const parsed = Number(headerCost);
    if (!Number.isNaN(parsed)) {
      logger.info(`💰 Using LiteLLM header cost: $${parsed}`);
      return parsed;
    }
  }

  // 2. fallback - body
  const bodyCost = data?._hidden_params?.response_cost ?? data?.response_cost;

  if (bodyCost !== undefined && bodyCost !== null) {
    const parsed = Number(bodyCost);
    if (!Number.isNaN(parsed)) {
      logger.info(`💰 Using LiteLLM body cost: $${parsed}`);
      return parsed;
    }
  }

  return undefined;
}

/**
 * סינון הקלט — זהה לכל ה-APIs: חילוץ טקסט המשתמש ובדיקתו מול הפרופיל.
 * מחזיר תשובת חסימה מוכנה ללקוח, או null אם מותר להמשיך לספק.
 */
async function filterInput(
  api: FilterApi,
  body: any,
  profile: FilterProfile,
  model: string,
  trace: RequestTrace,
): Promise<object | ReadableStream | null> {
  trace.setStage("filter");
  const text = extractFilterText(api, body);

  if (!text) {
    trace.recordFilter("", null);
    logger.info(
      JSON.stringify({ event: "filter.skipped", api, reason: "no-user-text" }),
    );
    return null;
  }

  const result = await evaluateInput(profile, text);
  trace.recordFilter(text, result);
  if (result.verdict === "allowed") return null;

  const reason = reasonCode(result);
  const logLine = JSON.stringify({
    event: result.verdict === "error" ? "proxy.filter_error" : "proxy.blocked",
    api,
    model,
    reason,
  });
  if (result.verdict === "error") logger.error(logLine);
  else logger.info(logLine);

  return buildBlockedResponse(
    // לתמונות אין עדיין פורמט חסימה ייעודי — מוחזרת תשובה בפורמט chat.
    api === "image" ? "chat" : api,
    model,
    reason,
    result.verdict === "error" ? "unavailable" : "policy",
    body.stream,
  );
}

/**
 * טוען את הפרופיל המלא של המשתמש — כולל הקטגוריות וה-prompts, שמוגדרים
 * select:false בסכמה (findById רגיל מחזיר אותם ריקים).
 */
async function loadProfile(user: any) {
  const profile = user?.profileId
    ? await getFullProfileById(user.profileId.toString())
    : null;
  if (!profile) throw new Error("Profile not found");
  return profile;
}

/**
 * עוטף פונקציית proxy ברשומת מעקב אחת (RequestLog):
 * מתעד שגיאות, את התשובה (רגילה או stream), ושומר בסוף.
 */
async function withTrace<T>(
  api: FilterApi,
  user: any,
  body: any,
  run: (trace: RequestTrace) => Promise<T>,
): Promise<T | ReadableStream<Uint8Array>> {
  const trace = new RequestTrace({ api, user, body });

  let result: T;
  try {
    result = await run(trace);
  } catch (err) {
    trace.fail(err);
    void trace.save();
    throw err;
  }

  // תשובת stream אמיתית מהספק — הרשומה תישמר כשה-stream יסתיים.
  if (result instanceof ReadableStream && !trace.isBlocked) {
    return trace.tapStream(result as ReadableStream<Uint8Array>);
  }

  if (!trace.isBlocked) trace.recordAnswer(extractAnswer(api, result));
  void trace.save();
  return result;
}

// ---------- proxies ---------------

export async function proxyChatCompletion(user: any, body: any) {
  return withTrace("chat", user, body, (trace) =>
    proxyChatCompletionImpl(user, body, trace),
  );
}

async function proxyChatCompletionImpl(user: any, body: any, trace: RequestTrace) {
  const model = body.model;

  if (!model) {
    throw new Error("Model is required");
  }

  // 1. זיהוי הספק
  const provider = getProviderFromModel(model);

  // 2. השגת מפתח הספק של המשתמש
  const providerKeyDoc =
    user.mode === "MANAGED"
      ? await getSystemProviderKey(provider)
      : await getProviderKeyByUserAndProvider(user._id.toString(), provider);

  if (!providerKeyDoc) {
    throw new Error(`Provider key missing for provider: ${provider}`);
  }

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);

  // Check if this provider key is free
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());

  // 3. סינון טקסט (Content Filtering)
  const profile = await loadProfile(user);

  const blocked = await filterInput("chat", body, profile, model, trace);
  if (blocked) return blocked;
  // מכאן: בניית הבקשה לספק וקריאה אליו.
  trace.setStage("provider");
  // 4. הוספת system prompts

  const systemPrompt = await buildSystemPrompt(profile);

  const messages = [...(body.messages || [])];

  if (systemPrompt) {
    messages.unshift({
      role: "system",
      content: systemPrompt,
    });
  }

  // 5. קריאה ל-LiteLLM עם העברת API Key דינמית

  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);
  if (!decryptedLiteLLMKey) {
    throw new Error("LiteLLM Proxy Key could not be decrypted or is missing");
  }

  // --- לוגים לבדיקה (מומלץ להשאיר עד שהצ'אט עובד) ---
  const startTime = Date.now();
  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: body.stream ?? false,
        // 🎯 המפתח של הספק
        api_key: providerApiKey,
      }),
    },
  );

  if (!litellmResponse.ok) {
    const errorText = await litellmResponse.text();

    logger.error("❌ LiteLLM Error Response:", {
      error: errorText,
      stack: errorText,
    });
    throw new Error(`LiteLLM request failed: ${errorText}`);
  }

  // 6. 🎯 החזרת התשובה - זה הקריטי!
  if (body.stream) {
    // החזר את ה-stream
    logger.debug("✅ Returning stream");

    // For streaming, we need to intercept the stream to collect usage data
    const reader = litellmResponse.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get stream reader");
    }

    const decoder = new TextDecoder();
    const accumulatedUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    let responseId = "streaming";
    let responseCost = 0;

    // Create a new ReadableStream that we'll return to the client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Stream finished - log the accumulated usage
              const responseTime = Date.now() - startTime;
              logger.info(
                "📊 Logging usage for streaming request, user:",
                user._id,
              );
              logger.info(
                "📊 Accumulated tokens:",
                accumulatedUsage.total_tokens,
              );

              // Fix: Calculate cost properly - if responseCost is 0, calculate from tokens
              // Normalize model name to include provider prefix for cost calculation
              const normalizedModel = normalizeModelName(model, provider);
              let streamCost = responseCost;
              if (!streamCost || streamCost === 0) {
                streamCost = calculateCostFromTokens(
                  accumulatedUsage,
                  normalizedModel,
                );
                logger.info(
                  `📊 LiteLLM didn't provide cost, calculated from tokens using model: ${normalizedModel}: $${streamCost.toFixed(6)}`,
                );
              } else {
                logger.info(
                  `📊 Using LiteLLM provided cost: $${streamCost.toFixed(6)}`,
                );
              }

              logUsage({
                userId: user._id.toString(),
                profileId: user.profileId?.toString(),
                provider,
                modelName: model,
                mode: user.mode,
                response: {
                  id: responseId,
                  usage: accumulatedUsage,
                  _hidden_params: { response_cost: responseCost },
                },
                responseTime,
                success: true,
                isFree,
                cost: streamCost,
              }).catch((err) =>
                logger.error("❌ Failed to log streaming usage:", {
                  error: err.message,
                  stack: err.stack,
                }),
              );

              controller.close();
              break;
            }

            // Parse the chunk to extract usage information
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);

                  // Extract usage data if present
                  if (parsed.usage) {
                    accumulatedUsage.prompt_tokens +=
                      parsed.usage.prompt_tokens || 0;
                    accumulatedUsage.completion_tokens +=
                      parsed.usage.completion_tokens || 0;
                    accumulatedUsage.total_tokens +=
                      parsed.usage.total_tokens || 0;
                  }
                  // Extract cost if present
                  if (parsed._hidden_params?.response_cost) {
                    responseCost = parsed._hidden_params.response_cost;
                  }

                  // Extract response ID
                  if (parsed.id) {
                    responseId = parsed.id;
                  }
                } catch (e) {
                  // Not valid JSON, skip
                }
              }
            }

            // Forward the chunk to the client
            controller.enqueue(value);
          }
        } catch (error: any) {
          logger.error("❌ Error in stream processing:", {
            error: error.message,
            stack: error.stack,
          });
          controller.error(error);
        }
      },
    });

    return stream;
  }

  // החזר את ה-JSON
  const data: any = await litellmResponse.json();

  // Fix: Calculate cost properly - if LiteLLM doesn't provide cost, calculate from tokens
  // Normalize model name to include provider prefix for cost calculation
  const normalizedModel = normalizeModelName(model, provider);
  let cost = getLiteLLMCost(litellmResponse, data);

  if (cost === undefined) {
    cost = calculateCostFromTokens(data.usage, normalizedModel);
    logger.info(
      `💰 LiteLLM cost missing, calculated from tokens using model: ${normalizedModel}: $${cost.toFixed(6)}`,
    );
  }

  logger.debug("✅ Response received from LiteLLM:");
  logger.info("- ID:", data.id);
  logger.info("- Model:", data.model);
  logger.info(
    "- Content:",
    data.choices?.[0]?.message?.content?.substring(0, 50) + "...",
  );
  logger.info("- Tokens:", data.usage?.total_tokens);

  // 7. Log usage
  const responseTime = Date.now() - startTime;
  logger.debug("📊 Logging usage for user:", user._id);
  try {
    await logUsage({
      userId: user._id.toString(),
      profileId: user.profileId?.toString(),
      provider,
      modelName: model,
      mode: user.mode,
      response: data,
      responseTime,
      success: true,
      isFree,
      cost,
    });
    logger.debug("✅ Usage logged successfully");
  } catch (logError) {
    logger.error("❌ Failed to log usage:", {
      error: logError instanceof Error ? logError.message : String(logError),
      stack: logError instanceof Error ? logError.stack : undefined,
    });
  }

  // 🚨 זה החלק הכי חשוב - להחזיר את הדאטה!
  return data;
}

export async function proxyResponses(user: any, body: any) {
  return withTrace("responses", user, body, (trace) =>
    proxyResponsesImpl(user, body, trace),
  );
}

async function proxyResponsesImpl(user: any, body: any, trace: RequestTrace) {
  const startTime = Date.now();
  const model = body.model;

  if (!model) throw new Error("Model is required");

  const provider = getProviderFromModel(model);

  const providerKeyDoc =
    user.mode === "MANAGED"
      ? await getSystemProviderKey(provider)
      : await getProviderKeyByUserAndProvider(user._id.toString(), provider);

  if (!providerKeyDoc)
    throw new Error(`Provider key missing for provider: ${provider}`);

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());
  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);

  if (!decryptedLiteLLMKey)
    throw new Error("LiteLLM Proxy Key could not be decrypted or is missing");

  // Content filtering - אותו לוגיק כמו בchat completions
  const profile = await loadProfile(user);

  const blocked = await filterInput("responses", body, profile, model, trace);
  if (blocked) return blocked;
  // מכאן: בניית הבקשה לספק וקריאה אליו.
  trace.setStage("provider");

  // System prompt מה-profile
  const systemPrompt = await buildSystemPrompt(profile);
  // ב-Responses API - system prompt הולך בתוך instructions
  const requestBody: any = {
    ...body,
    api_key: providerApiKey,
  };

  if (systemPrompt && !requestBody.instructions) {
    requestBody.instructions = systemPrompt;
  }

  logger.debug("--- DEBUG RESPONSES REQUEST ---");
  logger.debug("🔑 Provider:", provider);
  logger.debug("🔑 Model:", model);
  logger.debug("🌊 Stream:", body.stream ?? false);

  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/responses`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!litellmResponse.ok) {
    const errorText = await litellmResponse.text();
    logger.error("❌ LiteLLM Responses Error:", errorText);
    throw new Error(`LiteLLM responses request failed: ${errorText}`);
  }

  // ========== STREAMING ==========
  if (body.stream) {
    const reader = litellmResponse.body?.getReader();
    if (!reader) throw new Error("Failed to get stream reader");

    const decoder = new TextDecoder();
    const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let responseId = "streaming";
    let responseCost = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              const responseTime = Date.now() - startTime;
              const normalizedModel = normalizeModelName(model, provider);
              const streamCost =
                responseCost || calculateCostFromTokens(usage, normalizedModel);

              logUsage({
                userId: user._id.toString(),
                profileId: user.profileId?.toString(),
                provider,
                modelName: model,
                mode: user.mode,
                response: {
                  id: responseId,
                  usage,
                  _hidden_params: { response_cost: responseCost },
                },
                responseTime,
                success: true,
                isFree,
                cost: streamCost,
              }).catch((err) =>
                logger.error(
                  "❌ Failed to log streaming responses usage:",
                  err,
                ),
              );

              controller.close();
              break;
            }

            // פרסור events מה-stream לחילוץ usage
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                // Responses API - usage מגיע ב-response.completed event
                if (
                  parsed.type === "response.completed" &&
                  parsed.response?.usage
                ) {
                  const u = parsed.response.usage;
                  usage.prompt_tokens = u.input_tokens || 0;
                  usage.completion_tokens = u.output_tokens || 0;
                  usage.total_tokens =
                    (u.input_tokens || 0) + (u.output_tokens || 0);
                }

                if (parsed._hidden_params?.response_cost) {
                  responseCost = parsed._hidden_params.response_cost;
                }

                if (parsed.response?.id || parsed.id) {
                  responseId = parsed.response?.id || parsed.id;
                }
              } catch (_) {
                // not JSON, skip
              }
            }

            controller.enqueue(value);
          }
        } catch (error: any) {
          logger.error("❌ Error in responses stream:", error.message);
          controller.error(error);
        }
      },
    });

    return stream;
  }

  // ========== NON-STREAMING ==========
  const data: any = await litellmResponse.json();

  // Responses API מחזיר usage עם input_tokens/output_tokens (לא prompt/completion)
  const usageNormalized = {
    prompt_tokens: data.usage?.input_tokens || 0,
    completion_tokens: data.usage?.output_tokens || 0,
    total_tokens:
      (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };

  const normalizedModel = normalizeModelName(model, provider);
  let cost = getLiteLLMCost(litellmResponse, data);

  if (cost === undefined) {
    cost = calculateCostFromTokens(usageNormalized, normalizedModel);
    logger.info(
      `💰 LiteLLM cost missing, calculated from tokens: $${cost.toFixed(6)}`,
    );
  }

  logger.debug("✅ Responses API response received");
  logger.info("- ID:", data.id);
  logger.info("- Model:", data.model);
  logger.info("- Tokens:", usageNormalized.total_tokens);

  const responseTime = Date.now() - startTime;
  try {
    await logUsage({
      userId: user._id.toString(),
      profileId: user.profileId?.toString(),
      provider,
      modelName: model,
      mode: user.mode,
      response: { ...data, usage: usageNormalized },
      responseTime,
      success: true,
      isFree,
      cost,
    });
  } catch (logError: any) {
    logger.error("❌ Failed to log responses usage:", logError.message);
  }

  return data;
}

export async function proxyAnthropicMessages(user: any, body: any) {
  return withTrace("anthropic", user, body, (trace) =>
    proxyAnthropicMessagesImpl(user, body, trace),
  );
}

async function proxyAnthropicMessagesImpl(user: any, body: any, trace: RequestTrace) {
  const startTime = Date.now();
  const model = body.model;

  if (!model) {
    throw new Error("Model is required");
  }

  const provider = getProviderFromModel(model);

  const providerKeyDoc =
    user.mode === "MANAGED"
      ? await getSystemProviderKey(provider)
      : await getProviderKeyByUserAndProvider(user._id.toString(), provider);

  if (!providerKeyDoc) {
    throw new Error(`Provider key missing for provider: ${provider}`);
  }

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());

  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);
  if (!decryptedLiteLLMKey) {
    throw new Error("LiteLLM Proxy Key could not be decrypted or is missing");
  }

  const profile = await loadProfile(user);

  const blocked = await filterInput("anthropic", body, profile, model, trace);
  if (blocked) return blocked;
  // מכאן: בניית הבקשה לספק וקריאה אליו.
  trace.setStage("provider");

  const systemPrompt = await buildSystemPrompt(profile);

  const requestBody: any = {
    ...body,
    model: normalizeModelName(model, provider),
    api_key: providerApiKey,
  };

  if (systemPrompt) {
    requestBody.system = body.system
      ? `${systemPrompt}\n\n${body.system}`
      : systemPrompt;
  }

  logger.debug("--- DEBUG ANTHROPIC MESSAGES REQUEST ---");
  logger.debug("🔑 Provider:", provider);
  logger.debug("🔑 Model:", requestBody.model);
  logger.debug("🌊 Stream:", body.stream ?? false);

  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!litellmResponse.ok) {
    const errorText = await litellmResponse.text();

    logger.error("❌ LiteLLM Anthropic Messages Error:", {
      error: errorText,
      stack: errorText,
    });

    throw new Error(`LiteLLM anthropic messages request failed: ${errorText}`);
  }

  if (body.stream) {
    const stream = litellmResponse.body;
    if (!stream) {
      throw new Error("Failed to get Anthropic stream body");
    }

    return stream;
  }

  const data: any = await litellmResponse.json();

  const usageNormalized = {
    prompt_tokens: data.usage?.input_tokens || 0,
    completion_tokens: data.usage?.output_tokens || 0,
    total_tokens:
      (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };

  const normalizedModel = normalizeModelName(model, provider);

  let cost = getLiteLLMCost(litellmResponse, data);

  if (cost === undefined) {
    logger.info("💰 LiteLLM cost missing, calculating from tokens");

    cost = calculateCostFromTokens(usageNormalized, normalizedModel);
  }

  const responseTime = Date.now() - startTime;

  try {
    await logUsage({
      userId: user._id.toString(),
      profileId: user.profileId?.toString(),
      provider,
      modelName: model,
      mode: user.mode,
      response: { ...data, usage: usageNormalized },
      responseTime,
      success: true,
      isFree,
      cost,
    });
  } catch (logError: any) {
    logger.error(
      "❌ Failed to log anthropic messages usage:",
      logError.message,
    );
  }

  return data;
}

// ========== IMAGE GENERATION ==========
export async function proxyImageGeneration(user: any, body: any) {
  return withTrace("image", user, body, (trace) =>
    proxyImageGenerationImpl(user, body, trace),
  );
}

async function proxyImageGenerationImpl(user: any, body: any, trace: RequestTrace) {
  const startTime = Date.now();
  const model = body.model || "dall-e-3";

  const profile = await loadProfile(user);

  const provider = getProviderFromModel(model);

  const providerKeyDoc =
    user.mode === "MANAGED"
      ? await getSystemProviderKey(provider)
      : await getProviderKeyByUserAndProvider(user._id.toString(), provider);

  if (!providerKeyDoc) throw new Error(`Provider key missing for: ${provider}`);

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());
  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);

  const blocked = await filterInput("image", body, profile, model, trace);
  if (blocked) return blocked;
  // מכאן: בניית הבקשה לספק וקריאה אליו.
  trace.setStage("provider");

  if (!decryptedLiteLLMKey) throw new Error("LiteLLM key missing");

  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, api_key: providerApiKey }),
    },
  );

  if (!litellmResponse.ok) {
    const err = await litellmResponse.text();
    throw new Error(`LiteLLM image generation failed: ${err}`);
  }

  const data: any = await litellmResponse.json();

  // Calculate image cost based on request parameters
  const size = body.size || "1024x1024";
  const quality = body.quality || "standard";
  const n = body.n || 1;
  const imageCost = calculateImageCost(model, size, quality, n);

  const responseTime = Date.now() - startTime;
  logUsage({
    userId: user._id.toString(),
    profileId: user.profileId?.toString(),
    provider,
    modelName: model,
    mode: user.mode,
    response: data,
    responseTime,
    success: true,
    isFree,
    cost: imageCost,
  }).catch((err) => logger.error("Failed to log image usage:", err));

  return data;
}

// ========== AUDIO TRANSCRIPTION (Whisper) ==========
export async function proxyAudioTranscription(
  user: any,
  formData: FormData, // מגיע מה-multipart
  model: string = "whisper-1",
) {
  const startTime = Date.now();
  const provider = getProviderFromModel(model);

  const providerKeyDoc =
    user.mode === "MANAGED"
      ? await getSystemProviderKey(provider)
      : await getProviderKeyByUserAndProvider(user._id.toString(), provider);

  if (!providerKeyDoc) throw new Error(`Provider key missing for: ${provider}`);

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());
  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);

  if (!decryptedLiteLLMKey) throw new Error("LiteLLM key missing");

  // Forward the user's BYOK provider key alongside the file, same as the other proxy* functions
  formData.append("api_key", providerApiKey);

  // מעביר את ה-FormData ישירות ל-LiteLLM
  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/audio/transcriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        // Content-Type לא מוגדר - fetch יוסיף boundary אוטומטית ל-multipart
      },
      body: formData,
    },
  );

  if (!litellmResponse.ok) {
    const err = await litellmResponse.text();
    throw new Error(`LiteLLM transcription failed: ${err}`);
  }

  const data: any = await litellmResponse.json();

  const responseTime = Date.now() - startTime;
  logUsage({
    userId: user._id.toString(),
    profileId: user.profileId?.toString(),
    provider,
    modelName: model,
    mode: user.mode,
    response: data,
    responseTime,
    success: true,
    isFree,
    cost: 0,
  }).catch((err) => logger.error("Failed to log transcription usage:", err));

  return data;
}

// ========== AUDIO SPEECH (TTS) ==========
export async function proxyAudioSpeech(user: any, body: any) {
  const startTime = Date.now();
  const model = body.model || "tts-1";
  const provider = getProviderFromModel(model);

  const providerKeyDoc =
    user.mode === "MANAGED"
      ? await getSystemProviderKey(provider)
      : await getProviderKeyByUserAndProvider(user._id.toString(), provider);

  if (!providerKeyDoc) throw new Error(`Provider key missing for: ${provider}`);

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());
  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);

  if (!decryptedLiteLLMKey) throw new Error("LiteLLM key missing");

  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/audio/speech`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, api_key: providerApiKey }),
    },
  );

  if (!litellmResponse.ok) {
    const err = await litellmResponse.text();
    throw new Error(`LiteLLM TTS failed: ${err}`);
  }

  // TTS מחזיר binary audio - לא JSON!
  const audioBuffer = await litellmResponse.arrayBuffer();
  const contentType =
    litellmResponse.headers.get("content-type") || "audio/mpeg";

  // Calculate TTS cost based on input text
  const inputText = body.input || "";
  const ttsCost = calculateTTSCost(model, inputText);

  const responseTime = Date.now() - startTime;
  logUsage({
    userId: user._id.toString(),
    profileId: user.profileId?.toString(),
    provider,
    modelName: model,
    mode: user.mode,
    response: { id: "tts", usage: null },
    responseTime,
    success: true,
    isFree,
    cost: ttsCost,
  }).catch((err) => logger.error("Failed to log TTS usage:", err));

  return { buffer: audioBuffer, contentType };
}
