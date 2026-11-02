/**
 * בדיקות ל-input workflow ול-guardInput: חסימה לעומת שגיאת סינון.
 */

const mockJudge = jest.fn();

jest.mock("../../services/llmService", () => ({
  judgeText: (...args: unknown[]) => mockJudge(...args),
}));

jest.mock("../../logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

const mockProfile = { _id: "p1", name: "foo", allowedCategories: ["bar"], blockedCategories: ["baz"] };

jest.mock("../../repositories/profileRepository", () => ({
  getFullProfileById: jest.fn(async () => mockProfile),
}));

const mockLogCreate = jest.fn();
jest.mock("../../models", () => ({
  EvaluationLog: { create: (...args: unknown[]) => mockLogCreate(...args) },
}));

import { runInputWorkflow } from "../input/inputFilterWorkflow";
import { guardInput } from "../proxyFilter";

const ctx = { text: "lorem ipsum", profile: mockProfile, profileId: "p1" };
const meta = { judgeModel: "m", latencyMs: 1 };

describe("runInputWorkflow", () => {
  beforeEach(() => mockJudge.mockReset());

  it("allows and records the judge reason in the trace", async () => {
    mockJudge.mockResolvedValue({ verdict: "allowed", reason: "foo", ...meta });

    const result = await runInputWorkflow(ctx);

    expect(result.allowed).toBe(true);
    expect(result.errored).toBeUndefined();
    expect(result.trace[0]?.metadata).toMatchObject({ judgeReason: "foo", judgeModel: "m" });
  });

  it("blocks on a policy decision without marking it as an error", async () => {
    mockJudge.mockResolvedValue({ verdict: "blocked", reason: "foo", ...meta });

    const result = await runInputWorkflow(ctx);

    expect(result).toMatchObject({ allowed: false, reason: "blocked-by-llm" });
    expect(result.errored).toBeUndefined();
    expect(result.trace[0]?.status).toBe("block");
  });

  it("fails closed on judge error and marks it as errored", async () => {
    mockJudge.mockResolvedValue({ verdict: "error", error: "timeout", ...meta });

    const result = await runInputWorkflow(ctx);

    expect(result).toMatchObject({
      allowed: false,
      errored: true,
      reason: "error-in-llm-decision",
    });
    expect(result.trace[0]).toMatchObject({ status: "error", reason: "timeout" });
    expect(result.trace[0]?.metadata).toMatchObject({ judgeModel: "m" });
  });
});

describe("guardInput", () => {
  beforeEach(() => {
    mockJudge.mockReset();
    mockLogCreate.mockReset();
  });

  it("returns null when allowed", async () => {
    mockJudge.mockResolvedValue({ verdict: "allowed", reason: "foo", ...meta });

    const blocked = await guardInput({ profile: mockProfile, text: "lorem", model: "x", api: "chat" });

    expect(blocked).toBeNull();
  });

  it("returns a policy block payload and logs llmFinalDecision=blocked", async () => {
    mockJudge.mockResolvedValue({ verdict: "blocked", reason: "foo", ...meta });

    const blocked: any = await guardInput({ profile: mockProfile, text: "lorem", model: "x", api: "chat" });

    expect(blocked.safeai).toMatchObject({ blocked: true, kind: "policy" });
    expect(mockLogCreate.mock.calls[0][0].llmFinalDecision).toBe("blocked");
  });

  it("returns an 'unavailable' payload and logs llmFinalDecision=error", async () => {
    mockJudge.mockResolvedValue({ verdict: "error", error: "timeout", ...meta });

    const blocked: any = await guardInput({ profile: mockProfile, text: "lorem", model: "x", api: "anthropic" });

    expect(blocked.safeai).toMatchObject({ blocked: true, kind: "unavailable" });
    expect(blocked.content[0].text).toContain("אינו זמין זמנית");
    expect(mockLogCreate.mock.calls[0][0].llmFinalDecision).toBe("error");
  });
});
