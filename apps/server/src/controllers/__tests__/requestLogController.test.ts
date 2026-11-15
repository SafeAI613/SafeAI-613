import { parseRequestLogQuery } from "../requestLogController";

describe("parseRequestLogQuery", () => {
  it("uses defaults", () => {
    expect(parseRequestLogQuery({})).toEqual({ query: { limit: 50 } });
  });

  it("accepts valid filters", () => {
    const result = parseRequestLogQuery({
      status: "blocked",
      api: "anthropic",
      userId: "507f1f77bcf86cd799439011",
      before: "2026-01-01T00:00:00.000Z",
      limit: "10",
    });

    expect(result).toEqual({
      query: {
        status: "blocked",
        api: "anthropic",
        userId: "507f1f77bcf86cd799439011",
        before: new Date("2026-01-01T00:00:00.000Z"),
        limit: 10,
      },
    });
  });

  it.each([
    [{ status: "foo" }, "Invalid status"],
    [{ api: "bar" }, "Invalid api"],
    [{ userId: "baz" }, "Invalid userId"],
    [{ before: "not-a-date" }, "Invalid before"],
    [{ limit: "0" }, "limit must be"],
    [{ limit: "101" }, "limit must be"],
    [{ limit: "1.5" }, "limit must be"],
  ])("rejects %j", (q, message) => {
    const result = parseRequestLogQuery(q);
    expect("error" in result && result.error).toContain(message);
  });
});
