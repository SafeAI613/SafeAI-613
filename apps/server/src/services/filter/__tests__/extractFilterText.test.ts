import { extractFilterText } from "../extractFilterText";

describe("extractFilterText", () => {
  describe("chat", () => {
    it("checks only user messages (not system / assistant)", () => {
      const body = {
        messages: [
          { role: "system", content: "foo system" },
          { role: "user", content: "lorem" },
          { role: "assistant", content: "bar answer" },
          { role: "user", content: "ipsum" },
        ],
      };

      expect(extractFilterText("chat", body)).toBe(
        "Message 1:\nlorem\n\n---\n\nMessage 2:\nipsum",
      );
    });

    it("returns a single message without a header", () => {
      expect(
        extractFilterText("chat", { messages: [{ role: "user", content: "lorem" }] }),
      ).toBe("lorem");
    });

    it("reads text parts and ignores image parts", () => {
      const body = {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "lorem" },
              { type: "image_url", image_url: { url: "data:foo" } },
            ],
          },
        ],
      };

      expect(extractFilterText("chat", body)).toBe("lorem");
    });

    it("keeps only the last N user messages", () => {
      const messages = ["a", "b", "c", "d"].map((content) => ({ role: "user", content }));

      const result = extractFilterText("chat", { messages }, { maxMessages: 2 });

      expect(result).toBe("Message 1:\nc\n\n---\n\nMessage 2:\nd");
    });

    it("returns empty string when there is no user text", () => {
      expect(extractFilterText("chat", { messages: [{ role: "system", content: "foo" }] })).toBe("");
      expect(extractFilterText("chat", {})).toBe("");
      expect(extractFilterText("chat", null)).toBe("");
    });
  });

  describe("anthropic", () => {
    it("ignores tool_result and tool_use blocks", () => {
      const body = {
        system: "foo system",
        messages: [
          {
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: "1", content: "bar file content" },
              { type: "text", text: "lorem" },
            ],
          },
          { role: "assistant", content: [{ type: "tool_use", name: "baz", input: {} }] },
        ],
      };

      expect(extractFilterText("anthropic", body)).toBe("lorem");
    });

    it("strips agent tags but keeps the rest of the message", () => {
      const body = {
        messages: [
          {
            role: "user",
            content: "<system-reminder>foo</system-reminder>\nlorem ipsum",
          },
        ],
      };

      expect(extractFilterText("anthropic", body)).toBe("lorem ipsum");
    });

    it("cannot be bypassed by adding an agent tag to the message", () => {
      const body = {
        messages: [{ role: "user", content: "lorem <system-reminder></system-reminder>" }],
      };

      expect(extractFilterText("anthropic", body)).toBe("lorem");
    });

    it("skips a message that contains only agent blocks", () => {
      const body = {
        messages: [
          { role: "user", content: "lorem" },
          { role: "user", content: "<environment_details>foo</environment_details>" },
        ],
      };

      expect(extractFilterText("anthropic", body)).toBe("lorem");
    });
  });

  describe("responses", () => {
    it("accepts a string input", () => {
      expect(extractFilterText("responses", { input: "lorem" })).toBe("lorem");
    });

    it("reads user items and ignores function_call_output / assistant", () => {
      const body = {
        instructions: "foo system",
        input: [
          { role: "user", content: [{ type: "input_text", text: "lorem" }] },
          { type: "function_call_output", call_id: "1", output: "bar" },
          { role: "assistant", content: [{ type: "output_text", text: "baz" }] },
        ],
      };

      expect(extractFilterText("responses", body)).toBe("lorem");
    });
  });

  describe("image", () => {
    it("uses the prompt", () => {
      expect(extractFilterText("image", { prompt: "lorem" })).toBe("lorem");
    });

    it("returns empty string for a missing prompt", () => {
      expect(extractFilterText("image", {})).toBe("");
    });
  });

  it("truncates long messages from the middle, keeping start and end", () => {
    const text = "a".repeat(50) + "b".repeat(50);

    const result = extractFilterText("image", { prompt: text }, { maxCharsPerMessage: 20 });

    expect(result).toBe("a".repeat(10) + "\n[...]\n" + "b".repeat(10));
  });
});
