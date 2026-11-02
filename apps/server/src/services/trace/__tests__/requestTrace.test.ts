const mockCreate = jest.fn();

jest.mock("../../../repositories/requestLogRepository", () => ({
  createRequestLog: (...args: unknown[]) => mockCreate(...args),
}));

jest.mock("../../../logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
  requestContext: { getStore: () => ({ requestId: "req-1" }) },
}));

import { RequestTrace, MAX_CONTENT_CHARS } from "../requestTrace";
import type { EvaluateResult } from "../../../workflows/input/evaluate";

const user = { _id: "507f1f77bcf86cd799439011", profileId: "507f1f77bcf86cd799439012" };
const newTrace = (stream = false) =>
  new RequestTrace({ api: "chat", user, body: { model: "foo-model", stream } });

const allowed: EvaluateResult = {
  allowed: true,
  reason: "allowed-by-llm",
  trace: [
    {
      node: "llm-decision",
      status: "allow",
      durationMs: 1,
      metadata: { judgeReason: "foo", judgeModel: "bar", latencyMs: 5 },
    },
  ],
};
const blocked: EvaluateResult = { ...allowed, allowed: false, reason: "blocked-by-llm" };
const errored: EvaluateResult = {
  allowed: false,
  errored: true,
  reason: "error-in-llm-decision",
  trace: [{ node: "llm-decision", status: "error", reason: "timeout", durationMs: 1, metadata: {} }],
};

function savedRecord() {
  expect(mockCreate).toHaveBeenCalledTimes(1);
  return mockCreate.mock.calls[0][0];
}

describe("RequestTrace", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    delete process.env.REQUEST_LOG_STORE_CONTENT;
  });

  it("records a completed request with question, filter and answer", async () => {
    const trace = newTrace();
    trace.recordFilter("lorem", allowed);
    trace.recordAnswer({ text: "ipsum", providerResponseId: "resp-1" });
    await trace.save();

    expect(savedRecord()).toMatchObject({
      requestId: "req-1",
      api: "chat",
      model: "foo-model",
      status: "completed",
      question: "lorem",
      answer: "ipsum",
      providerResponseId: "resp-1",
      filter: { verdict: "allowed", reason: "allowed-by-llm", judgeReason: "foo", judgeModel: "bar", latencyMs: 5 },
    });
  });

  it("status blocked for a policy block", async () => {
    const trace = newTrace();
    trace.recordFilter("lorem", blocked);
    await trace.save();

    expect(trace.isBlocked).toBe(true);
    expect(savedRecord()).toMatchObject({ status: "blocked", filter: { verdict: "blocked" } });
  });

  it("status filter_error when the judge failed", async () => {
    const trace = newTrace();
    trace.recordFilter("lorem", errored);
    await trace.save();

    expect(savedRecord()).toMatchObject({
      status: "filter_error",
      filter: { verdict: "error", error: "timeout" },
    });
  });

  it("status error with the stage where it happened", async () => {
    const trace = newTrace();
    trace.recordFilter("lorem", allowed);
    trace.setStage("provider");
    trace.fail(new Error("LiteLLM request failed"));
    await trace.save();

    expect(savedRecord()).toMatchObject({
      status: "error",
      error: { stage: "provider", message: "LiteLLM request failed" },
    });
  });

  it("records skipped filter when there was no user text", async () => {
    const trace = newTrace();
    trace.recordFilter("", null);
    await trace.save();

    expect(savedRecord()).toMatchObject({ status: "completed", filter: { verdict: "skipped" } });
    expect(savedRecord().question).toBeUndefined();
  });

  it("truncates long content", async () => {
    const trace = newTrace();
    trace.recordFilter("a".repeat(MAX_CONTENT_CHARS + 50), allowed);
    await trace.save();

    expect(savedRecord().question).toHaveLength(MAX_CONTENT_CHARS + 1);
  });

  it("does not store content when REQUEST_LOG_STORE_CONTENT=false", async () => {
    process.env.REQUEST_LOG_STORE_CONTENT = "false";
    const trace = newTrace();
    trace.recordFilter("lorem", allowed);
    trace.recordAnswer({ text: "ipsum", providerResponseId: "resp-1" });
    await trace.save();

    const record = savedRecord();
    expect(record.question).toBeUndefined();
    expect(record.answer).toBeUndefined();
    expect(record.providerResponseId).toBe("resp-1");
  });

  it("saves only once and never throws", async () => {
    mockCreate.mockRejectedValue(new Error("db down"));
    const trace = newTrace();

    await expect(trace.save()).resolves.toBeUndefined();
    await trace.save();

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  describe("tapStream", () => {
    const encoder = new TextEncoder();
    const sourceOf = (chunks: string[]) =>
      new ReadableStream<Uint8Array>({
        start(c) {
          chunks.forEach((x) => c.enqueue(encoder.encode(x)));
          c.close();
        },
      });

    it("passes bytes through unchanged and saves the collected answer at the end", async () => {
      const chunks = [
        `data: ${JSON.stringify({ id: "resp-1", choices: [{ delta: { content: "lor" } }] })}\n\n`,
        `data: ${JSON.stringify({ id: "resp-1", choices: [{ delta: { content: "em" } }] })}\n\ndata: [DONE]\n\n`,
      ];
      const trace = newTrace(true);
      trace.recordFilter("q", allowed);

      const text = await new Response(trace.tapStream(sourceOf(chunks))).text();
      await new Promise((r) => setImmediate(r));

      expect(text).toBe(chunks.join(""));
      expect(savedRecord()).toMatchObject({
        status: "completed",
        stream: true,
        answer: "lorem",
        providerResponseId: "resp-1",
      });
    });

    it("records a stream error", async () => {
      const source = new ReadableStream<Uint8Array>({
        pull(c) {
          c.error(new Error("upstream reset"));
        },
      });
      const trace = newTrace(true);

      await expect(new Response(trace.tapStream(source)).text()).rejects.toThrow("upstream reset");
      await new Promise((r) => setImmediate(r));

      expect(savedRecord()).toMatchObject({
        status: "error",
        error: { stage: "stream", message: "upstream reset" },
      });
    });

    it("records a client cancel", async () => {
      const trace = newTrace(true);
      const stream = trace.tapStream(sourceOf(["data: {}\n\n"]));

      await stream.cancel("client gone");
      await new Promise((r) => setImmediate(r));

      expect(savedRecord().error).toMatchObject({ stage: "stream" });
      expect(savedRecord().error.message).toContain("client cancelled");
    });
  });
});
