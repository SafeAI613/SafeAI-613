const mockJudge = jest.fn();
const mockCreateLog = jest.fn();

jest.mock("../judge", () => ({ judgeText: (...args: unknown[]) => mockJudge(...args) }));
jest.mock("../../../repositories/evaluationRepository", () => ({
  createEvaluationLog: (...args: unknown[]) => mockCreateLog(...args),
}));
jest.mock("../../../logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

import { evaluateInput, reasonCode } from "../inputFilter";

const profile = { _id: "p1", name: "foo", allowedCategories: ["bar"], blockedCategories: ["baz"] };
const meta = { judgeModel: "m", latencyMs: 1 };

describe("evaluateInput", () => {
  beforeEach(() => {
    mockJudge.mockReset();
    mockCreateLog.mockReset().mockResolvedValue({});
  });

  it("sends the profile name and both category lists to the judge", async () => {
    mockJudge.mockResolvedValue({ verdict: "allowed", reason: "ok", ...meta });

    await evaluateInput(profile, "lorem");

    expect(mockJudge).toHaveBeenCalledWith(
      "lorem",
      "foo",
      "allowed categories: bar\nblocked categories: baz",
    );
  });

  it("returns the judge result and audits a block", async () => {
    mockJudge.mockResolvedValue({ verdict: "blocked", reason: "matches baz", ...meta });

    const result = await evaluateInput(profile, "lorem");

    expect(result.verdict).toBe("blocked");
    expect(mockCreateLog.mock.calls[0][0]).toMatchObject({
      profileId: "p1",
      text: "lorem",
      initialDecision: "blocked-by-llm",
      llmFinalDecision: "blocked",
      blockedBy: "llm-decision",
      judgeReason: "matches baz",
      judgeModel: "m",
    });
  });

  it("audits a judge error as llmFinalDecision=error", async () => {
    mockJudge.mockResolvedValue({ verdict: "error", error: "timeout", ...meta });

    const result = await evaluateInput(profile, "lorem");

    expect(result.verdict).toBe("error");
    expect(mockCreateLog.mock.calls[0][0]).toMatchObject({
      initialDecision: "filter-error",
      llmFinalDecision: "error",
      error: "timeout",
    });
  });

  it("skips the audit when audit=false", async () => {
    mockJudge.mockResolvedValue({ verdict: "allowed", reason: "ok", ...meta });

    await evaluateInput(profile, "lorem", { audit: false });

    expect(mockCreateLog).not.toHaveBeenCalled();
  });

  it("does not fail when the audit write fails", async () => {
    mockJudge.mockResolvedValue({ verdict: "allowed", reason: "ok", ...meta });
    mockCreateLog.mockRejectedValue(new Error("db down"));

    await expect(evaluateInput(profile, "lorem")).resolves.toMatchObject({ verdict: "allowed" });
  });
});

describe("reasonCode", () => {
  it.each([
    [{ verdict: "allowed", reason: "x", ...meta }, "allowed-by-llm"],
    [{ verdict: "blocked", reason: "x", ...meta }, "blocked-by-llm"],
    [{ verdict: "error", error: "x", ...meta }, "filter-error"],
  ] as const)("%j → %s", (result, code) => {
    expect(reasonCode(result)).toBe(code);
  });
});
