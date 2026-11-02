const mockGetProfile = jest.fn();
const mockEvaluate = jest.fn();

jest.mock("../../repositories/profileRepository", () => ({
  getFullProfileById: (...args: unknown[]) => mockGetProfile(...args),
}));
jest.mock("../../services/filter/inputFilter", () => ({
  evaluateInput: (...args: unknown[]) => mockEvaluate(...args),
  reasonCode: (r: { verdict: string }) =>
    r.verdict === "error" ? "filter-error" : r.verdict === "allowed" ? "allowed-by-llm" : "blocked-by-llm",
}));
// filterController מייבא גם את שירותי ה-embeddings/profiles — לא רלוונטיים כאן.
jest.mock("../../services/filterService", () => ({}));
jest.mock("../../services/profileService", () => ({}));

import express from "express";
import request from "supertest";
import { evaluateHandler } from "../filterController";

const app = express();
app.use(express.json());
app.post("/filter/evaluate", evaluateHandler);

const profileId = "507f1f77bcf86cd799439011";
const meta = { judgeModel: "m", latencyMs: 1 };

describe("POST /filter/evaluate", () => {
  beforeEach(() => {
    mockGetProfile.mockReset().mockResolvedValue({ _id: profileId, name: "foo" });
    mockEvaluate.mockReset();
  });

  it.each([
    [{}],
    [{ profileId, text: "" }],
    [{ profileId: "bad", text: "lorem" }],
  ])("400 for invalid body %j", async (body) => {
    const res = await request(app).post("/filter/evaluate").send(body);
    expect(res.status).toBe(400);
  });

  it("404 when the profile does not exist", async () => {
    mockGetProfile.mockResolvedValue(null);
    const res = await request(app).post("/filter/evaluate").send({ profileId, text: "lorem" });
    expect(res.status).toBe(404);
  });

  it("200 with allowed, reason code and judge reason", async () => {
    mockEvaluate.mockResolvedValue({ verdict: "blocked", reason: "matches baz", ...meta });

    const res = await request(app).post("/filter/evaluate").send({ profileId, text: "lorem" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      allowed: false,
      verdict: "blocked",
      reason: "blocked-by-llm",
      judgeReason: "matches baz",
    });
    expect(mockEvaluate.mock.calls[0][2]).toEqual({ audit: true });
  });

  it("passes auditDisabled through", async () => {
    mockEvaluate.mockResolvedValue({ verdict: "allowed", reason: "ok", ...meta });

    await request(app).post("/filter/evaluate").send({ profileId, text: "lorem", auditDisabled: true });

    expect(mockEvaluate.mock.calls[0][2]).toEqual({ audit: false });
  });
});
