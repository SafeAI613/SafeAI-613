/**
 * בדיקות ל-judgeText: Structured Output, הבחנה בין חסימה לשגיאה.
 */

const mockCreate = jest.fn();

jest.mock("../../config/openai", () => ({
  openai: { chat: { completions: { create: (...args: unknown[]) => mockCreate(...args) } } },
}));

jest.mock("../promptBuilder", () => ({
  buildFilterPrompt: jest.fn().mockResolvedValue("filter prompt"),
}));

jest.mock("../../logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

import { judgeText } from "../llmService";

function reply(message: Record<string, unknown>) {
  return { choices: [{ message }] };
}

describe("judgeText", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns allowed with the judge's reason", async () => {
    mockCreate.mockResolvedValue(
      reply({ content: JSON.stringify({ verdict: "allowed", reason: "foo" }) }),
    );

    const result = await judgeText("lorem ipsum", "bar", "baz");

    expect(result).toMatchObject({ verdict: "allowed", reason: "foo" });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns blocked with the judge's reason", async () => {
    mockCreate.mockResolvedValue(
      reply({ content: JSON.stringify({ verdict: "blocked", reason: "foo" }) }),
    );

    const result = await judgeText("lorem ipsum", "bar", "baz");

    expect(result).toMatchObject({ verdict: "blocked", reason: "foo" });
  });

  it("sends a strict json_schema and no temperature", async () => {
    mockCreate.mockResolvedValue(
      reply({ content: JSON.stringify({ verdict: "allowed", reason: "foo" }) }),
    );

    await judgeText("lorem ipsum", "bar", "baz");

    const [body, options] = mockCreate.mock.calls[0];
    expect(body.temperature).toBeUndefined();
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(options.timeout).toBeGreaterThan(0);
  });

  it("treats a model refusal as blocked", async () => {
    mockCreate.mockResolvedValue(reply({ content: null, refusal: "no" }));

    const result = await judgeText("lorem ipsum", "bar", "baz");

    expect(result.verdict).toBe("blocked");
  });

  it("returns error (not blocked) when the API call throws", async () => {
    mockCreate.mockRejectedValue(new Error("400 Unsupported value: temperature"));

    const result = await judgeText("lorem ipsum", "bar", "baz");

    expect(result).toMatchObject({
      verdict: "error",
      error: "400 Unsupported value: temperature",
    });
  });

  it("returns error on empty content", async () => {
    mockCreate.mockResolvedValue(reply({ content: "" }));

    const result = await judgeText("lorem ipsum", "bar", "baz");

    expect(result.verdict).toBe("error");
  });

  it("returns error on malformed JSON", async () => {
    mockCreate.mockResolvedValue(reply({ content: "Allowed." }));

    const result = await judgeText("lorem ipsum", "bar", "baz");

    expect(result.verdict).toBe("error");
  });

  it("returns error when verdict is outside the enum", async () => {
    mockCreate.mockResolvedValue(
      reply({ content: JSON.stringify({ verdict: "maybe", reason: "foo" }) }),
    );

    const result = await judgeText("lorem ipsum", "bar", "baz");

    expect(result.verdict).toBe("error");
  });
});
