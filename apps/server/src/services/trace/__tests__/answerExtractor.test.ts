import { extractAnswer, SSEAnswerCollector } from "../answerExtractor";

const sse = (events: unknown[]) =>
  events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n";

describe("extractAnswer (non-stream)", () => {
  it("chat: content and tool calls", () => {
    const data = {
      id: "foo-1",
      choices: [{ message: { content: "lorem", tool_calls: [{ function: { name: "bar" } }] } }],
    };

    expect(extractAnswer("chat", data)).toEqual({
      text: "lorem\n[tool: bar]",
      providerResponseId: "foo-1",
    });
  });

  it("responses: output_text and function_call", () => {
    const data = {
      id: "foo-2",
      output: [
        { type: "message", content: [{ type: "output_text", text: "lorem" }] },
        { type: "function_call", name: "bar" },
      ],
    };

    expect(extractAnswer("responses", data).text).toBe("lorem\n[tool: bar]");
  });

  it("anthropic: text and tool_use blocks", () => {
    const data = {
      id: "foo-3",
      content: [
        { type: "text", text: "lorem" },
        { type: "tool_use", name: "bar", input: {} },
      ],
    };

    expect(extractAnswer("anthropic", data)).toEqual({
      text: "lorem\n[tool: bar]",
      providerResponseId: "foo-3",
    });
  });

  it("image: count only", () => {
    expect(extractAnswer("image", { data: [{}, {}] }).text).toBe("[2 image(s)]");
  });

  it("returns empty text for non-object data", () => {
    expect(extractAnswer("chat", null)).toEqual({ text: "" });
  });
});

describe("SSEAnswerCollector", () => {
  it("chat: joins deltas even when a line is split across chunks", () => {
    const body = sse([
      { id: "foo-1", choices: [{ delta: { content: "lor" } }] },
      { id: "foo-1", choices: [{ delta: { content: "em" } }] },
    ]);
    const c = new SSEAnswerCollector("chat");

    // חותך באמצע שורה
    c.push(body.slice(0, 25));
    c.push(body.slice(25));

    expect(c.result()).toEqual({ text: "lorem", providerResponseId: "foo-1" });
  });

  it("chat: records tool calls once per call", () => {
    const c = new SSEAnswerCollector("chat");
    c.push(
      sse([
        { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: "bar", arguments: "" } }] } }] },
        { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: "{}" } }] } }] },
      ]),
    );

    expect(c.result().text).toBe("\n[tool: bar]\n");
  });

  it("responses: output_text deltas", () => {
    const c = new SSEAnswerCollector("responses");
    c.push(
      sse([
        { type: "response.created", response: { id: "foo-2" } },
        { type: "response.output_text.delta", delta: "lorem " },
        { type: "response.output_text.delta", delta: "ipsum" },
      ]),
    );

    expect(c.result()).toEqual({ text: "lorem ipsum", providerResponseId: "foo-2" });
  });

  it("anthropic: text deltas with event lines", () => {
    const c = new SSEAnswerCollector("anthropic");
    c.push(
      "event: message_start\n" +
        `data: ${JSON.stringify({ type: "message_start", message: { id: "foo-3" } })}\n\n` +
        "event: content_block_delta\n" +
        `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "lorem" } })}\n\n`,
    );

    expect(c.result()).toEqual({ text: "lorem", providerResponseId: "foo-3" });
  });

  it("ignores malformed lines", () => {
    const c = new SSEAnswerCollector("chat");
    c.push("data: {not json\n\n: comment\n\n");

    expect(c.result().text).toBe("");
  });
});
