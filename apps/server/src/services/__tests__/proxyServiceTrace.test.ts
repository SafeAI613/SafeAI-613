/**
 * בדיקת החיבור בין proxyChatCompletion ל-RequestTrace:
 * כל בקשה נשמרת כ-RequestLog אחד עם הסטטוס הנכון.
 */

const mockCreateLog = jest.fn();
const mockGuardInput = jest.fn();

jest.mock("../../repositories/requestLogRepository", () => ({
  createRequestLog: (...args: unknown[]) => mockCreateLog(...args),
}));
jest.mock("../../workflows/proxyFilter", () => ({
  guardInput: (...args: unknown[]) => mockGuardInput(...args),
}));
jest.mock("../../models", () => ({
  AIProfile: { findById: jest.fn(async () => ({ _id: "p1", name: "foo" })) },
}));
jest.mock("../../repositories/providerKeyRepository", () => ({
  getSystemProviderKey: jest.fn(),
  getProviderKeyByUserAndProvider: jest.fn(async () => ({ _id: "k1", apiKeyEncrypted: "enc" })),
}));
jest.mock("../../utils/crypto", () => ({ decryptSecret: () => "secret" }));
jest.mock("../usageTracker", () => ({ logUsage: jest.fn(async () => undefined) }));
jest.mock("../../middleware/rateLimiter", () => ({ isProviderKeyFree: () => false }));
jest.mock("../promptBuilder", () => ({ buildSystemPrompt: jest.fn(async () => "") }));
jest.mock("../../logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
  requestContext: { getStore: () => ({ requestId: "req-1" }) },
}));

import { proxyChatCompletion } from "../proxyService";

const user = { _id: "507f1f77bcf86cd799439011", mode: "BYOK", profileId: "507f1f77bcf86cd799439012", litellmKeyEncrypted: "x" };
const body = { model: "gpt-foo", messages: [{ role: "user", content: "lorem" }] };

const allowedEval = { allowed: true, reason: "allowed-by-llm", trace: [] };
const blockedEval = { allowed: false, reason: "blocked-by-llm", trace: [] };

function guardWith(evaluation: typeof allowedEval, response: object | null) {
  mockGuardInput.mockImplementation(async (args: { onEvaluated?: (r: unknown) => void }) => {
    args.onEvaluated?.(evaluation);
    return response;
  });
}

const flush = () => new Promise((r) => setImmediate(r));
const saved = () => mockCreateLog.mock.calls[0][0];

describe("proxyChatCompletion → RequestLog", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    mockCreateLog.mockReset();
    mockGuardInput.mockReset();
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  it("completed: stores question, answer and provider id", async () => {
    guardWith(allowedEval, null);
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ id: "resp-1", choices: [{ message: { content: "ipsum" } }], usage: {} }), {
        status: 200,
      }),
    ) as typeof fetch;

    await proxyChatCompletion(user, body);
    await flush();

    expect(saved()).toMatchObject({
      requestId: "req-1",
      status: "completed",
      question: "lorem",
      answer: "ipsum",
      providerResponseId: "resp-1",
      filter: { verdict: "allowed" },
    });
  });

  it("blocked: does not call the provider and stores status blocked", async () => {
    guardWith(blockedEval, { safeai: { blocked: true } });
    global.fetch = jest.fn() as typeof fetch;

    const result = await proxyChatCompletion(user, body);
    await flush();

    expect(result).toEqual({ safeai: { blocked: true } });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(saved()).toMatchObject({ status: "blocked", question: "lorem" });
    expect(saved().answer).toBeUndefined();
  });

  it("provider error: rethrows and stores status error at stage provider", async () => {
    guardWith(allowedEval, null);
    global.fetch = jest.fn(async () => new Response("bad gateway", { status: 502 })) as typeof fetch;

    await expect(proxyChatCompletion(user, body)).rejects.toThrow("LiteLLM request failed");
    await flush();

    expect(saved()).toMatchObject({ status: "error", error: { stage: "provider" } });
  });

  it("stream: saves the answer after the stream is consumed", async () => {
    guardWith(allowedEval, null);
    const sse =
      `data: ${JSON.stringify({ id: "resp-2", choices: [{ delta: { content: "ipsum" } }] })}\n\n` +
      "data: [DONE]\n\n";
    global.fetch = jest.fn(async () => new Response(sse, { status: 200 })) as typeof fetch;

    const stream = (await proxyChatCompletion(user, { ...body, stream: true })) as ReadableStream;
    expect(mockCreateLog).not.toHaveBeenCalled();

    const text = await new Response(stream).text();
    await flush();

    expect(text).toBe(sse);
    expect(saved()).toMatchObject({ status: "completed", stream: true, answer: "ipsum", providerResponseId: "resp-2" });
  });
});
