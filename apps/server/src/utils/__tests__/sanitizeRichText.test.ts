import { describe, it, expect } from "@jest/globals";
import { sanitizeRichText } from "../sanitizeRichText";

describe("sanitizeRichText", () => {
  it("removes script tags and inline event handlers", () => {
    const out = sanitizeRichText('<p>foo<script>alert(1)</script><img src=x onerror="alert(1)"></p>');
    expect(out).toBe("<p>foo</p>");
  });

  it("removes javascript: links but keeps safe ones, forcing safe rel/target", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">bar</a>')).not.toContain("javascript:");
    const out = sanitizeRichText('<a href="https://example.com" onclick="x()">bar</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).not.toContain("onclick");
  });

  it("drops iframes, svg and style tags entirely", () => {
    const out = sanitizeRichText('<iframe src="https://example.com"></iframe><svg onload="x()"></svg><style>*{}</style>baz');
    expect(out).toBe("baz");
  });

  it("keeps the formatting the Tiptap editor produces", () => {
    const html =
      '<p style="text-align:right"><strong>foo</strong> <em>bar</em> <span style="color:#ff0000">baz</span> <mark data-color="#ffff00" style="background-color:#ffff00">qux</mark></p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("strips disallowed CSS properties", () => {
    const out = sanitizeRichText('<p style="position:fixed;text-align:center">foo</p>');
    expect(out).toBe('<p style="text-align:center">foo</p>');
  });
});
