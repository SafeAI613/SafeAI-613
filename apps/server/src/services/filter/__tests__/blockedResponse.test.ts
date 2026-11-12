import { buildBlockedResponse } from "../blockedResponse";

describe("buildBlockedResponse", () => {
  it("chat policy block", () => {
    const res: any = buildBlockedResponse("chat", "foo", "blocked-by-llm", "policy");

    expect(res.object).toBe("chat.completion");
    expect(res.choices[0].finish_reason).toBe("content_filter");
    expect(res.choices[0].message.content).toContain("blocked-by-llm");
    expect(res.safeai).toEqual({ blocked: true, reason: "blocked-by-llm", kind: "policy" });
  });

  it("anthropic 'unavailable' uses the temporary-outage message", () => {
    const res: any = buildBlockedResponse("anthropic", "foo", "filter-error", "unavailable");

    expect(res.type).toBe("message");
    expect(res.content[0].text).toContain("אינו זמין זמנית");
  });

  it("responses shape", () => {
    const res: any = buildBlockedResponse("responses", "foo", "blocked-by-llm", "policy");

    expect(res.object).toBe("response");
  });

  it("wraps in SSE when stream=true", async () => {
    const res = buildBlockedResponse("chat", "foo", "blocked-by-llm", "policy", true);

    expect(res).toBeInstanceOf(ReadableStream);
    const text = await new Response(res as ReadableStream).text();
    expect(text).toMatch(/^data: \{.*\}\n\ndata: \[DONE\]\n\n$/s);
  });
});
