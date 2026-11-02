/**
 * בדיקת החיבור בין proxyChatCompletion ל-RequestTrace:
 * כל בקשה נשמרת כ-RequestLog אחד עם הסטטוס הנכון.
 */

const mockCreateLog = jest.fn();
const mockEvaluate = jest.fn();

jest.mock("../../repositories/requestLogRepository", () => ({
  createRequestLog: (...args: unknown[]) => mockCreateLog(...args),
}));
jest.mock("../filter/judge", () => ({
  judgeText: (...args: unknown[]) => mockEvaluate(...args),
}));
jest.mock("../../repositories/evaluationRepository", () => ({
  createEvaluationLog: jest.fn(async () => ({})),
}));
const mockGetProfile = jest.fn();
jest.mock("../../repositories/profileRepository", () => ({
  getFullProfileById: (...args: unknown[]) => mockGetProfile(...args),
}));
jest.mock("../../repositories/providerKeyRepository", () => ({
  getSystemProviderKey: jest.fn(),
  getProviderKeyByUserAndProvider: jest.fn(async () => ({ _id: "k1", apiKeyEncrypted: "enc" })),
}));
jest.mock("../../utils/crypto", () => ({ decryptSecret: () => "secret" }));
jest.mock("../usageTracker", () => ({ logUsage: jest.fn(async () => undefined) }));
jest.mock("../../middleware/rateLimiter", () => ({ isProviderKeyFree: () => false }));
// מדמה את buildSystemPrompt: מחבר את ה-prompts של הפרופיל שהתקבל.
jest.mock("../promptBuilder", () => ({
  buildSystemPrompt: jest.fn(async (p: { contentPrompts?: string[] }) =>
    (p?.contentPrompts ?? []).join("\n\n"),
  ),
}));
jest.mock("../../logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
  requestContext: { getStore: () => ({ requestId: "req-1" }) },
}));

import { proxyChatCompletion } from "../proxyService";

const user = { _id: "507f1f77bcf86cd799439011", mode: "BYOK", profileId: "507f1f77bcf86cd799439012", litellmKeyEncrypted: "x" };
const body = { model: "gpt-foo", messages: [{ role: "user", content: "lorem" }] };

const meta = { judgeModel: "m", latencyMs: 1 };
const allowedEval = { verdict: "allowed", reason: "ok", ...meta };
const blockedEval = { verdict: "blocked", reason: "matches baz", ...meta };

function judgeWith(evaluation: object) {
  mockEvaluate.mockResolvedValue(evaluation);
}

const flush = () => new Promise((r) => setImmediate(r));
const saved = () => mockCreateLog.mock.calls[0][0];

describe("proxyChatCompletion → RequestLog", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    mockCreateLog.mockReset();
    mockEvaluate.mockReset();
    mockGetProfile.mockReset().mockResolvedValue({
      _id: "p1",
      name: "foo",
      blockedCategories: ["baz"],
      contentPrompts: ["lorem prompt"],
    });
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  it("completed: stores question, answer and provider id", async () => {
    judgeWith(allowedEval);
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
      filter: { verdict: "allowed", judgeReason: "ok" },
    });
  });

  it("judge error: returns the 'unavailable' message and stores filter_error", async () => {
    judgeWith({ verdict: "error", error: "timeout", ...meta });
    global.fetch = jest.fn() as typeof fetch;

    const result: any = await proxyChatCompletion(user, body);
    await flush();

    expect(result.safeai.kind).toBe("unavailable");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(saved()).toMatchObject({ status: "filter_error", filter: { verdict: "error", error: "timeout" } });
  });

  it("loads the full profile once and injects its prompts into the system prompt", async () => {
    judgeWith(allowedEval);
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ id: "r", choices: [{ message: { content: "x" } }] }), { status: 200 }),
    ) as typeof fetch;

    await proxyChatCompletion(user, body);

    expect(mockGetProfile).toHaveBeenCalledTimes(1);
    // judge receives the categories from the full profile
    expect(mockEvaluate.mock.calls[0][2]).toContain("blocked categories: baz");
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(sent.messages[0]).toEqual({ role: "system", content: "lorem prompt" });
  });

  it("blocked: does not call the provider and stores status blocked", async () => {
    judgeWith(blockedEval);
    global.fetch = jest.fn() as typeof fetch;

    const result: any = await proxyChatCompletion(user, body);
    await flush();

    expect(result.safeai).toEqual({ blocked: true, reason: "blocked-by-llm", kind: "policy" });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(saved()).toMatchObject({ status: "blocked", question: "lorem" });
    expect(saved().answer).toBeUndefined();
  });

  it("provider error: rethrows and stores status error at stage provider", async () => {
    judgeWith(allowedEval);
    global.fetch = jest.fn(async () => new Response("bad gateway", { status: 502 })) as typeof fetch;

    await expect(proxyChatCompletion(user, body)).rejects.toThrow("LiteLLM request failed");
    await flush();

    expect(saved()).toMatchObject({ status: "error", error: { stage: "provider" } });
  });

  it("stream: saves the answer after the stream is consumed", async () => {
    judgeWith(allowedEval);
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
