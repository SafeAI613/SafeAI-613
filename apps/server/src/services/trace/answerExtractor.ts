/**
 * server/src/services/trace/answerExtractor.ts
 *
 * חילוץ טקסט התשובה מתשובת הספק — לצורכי מעקב בלבד (RequestLog).
 * לא משנה את התשובה שנשלחת ללקוח.
 *
 *  - extractAnswer      → לתשובה רגילה (JSON).
 *  - SSEAnswerCollector → לתשובת stream: מקבל chunks של SSE וצובר את הטקסט.
 *
 * קריאות לכלים (tool calls) נרשמות כ-"[tool: name]", כדי שיהיה ברור
 * מה ה-agent ביקש לעשות גם כשאין טקסט.
 */

import { RequestLogApi } from "../../models/requestLog";

export interface ExtractedAnswer {
  text: string;
  providerResponseId?: string | undefined;
}

// תשובות הספקים הן JSON לא מטופס; כל גישה מוגנת ב-?. ובבדיקת typeof.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

function toolMarker(name: unknown): string {
  return `[tool: ${typeof name === "string" ? name : "unknown"}]`;
}

/** חילוץ מתשובה רגילה (לא stream). */
export function extractAnswer(api: RequestLogApi, data: unknown): ExtractedAnswer {
  if (typeof data !== "object" || data === null) return { text: "" };
  const d = data as Json;
  const id = typeof d.id === "string" ? d.id : undefined;
  const parts: string[] = [];

  switch (api) {
    case "chat": {
      const message = d.choices?.[0]?.message;
      if (typeof message?.content === "string") parts.push(message.content);
      for (const call of message?.tool_calls ?? []) parts.push(toolMarker(call?.function?.name));
      break;
    }
    case "responses": {
      for (const item of d.output ?? []) {
        if (item?.type === "message") {
          for (const c of item.content ?? []) {
            if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
          }
        } else if (item?.type === "function_call") {
          parts.push(toolMarker(item.name));
        }
      }
      break;
    }
    case "anthropic": {
      for (const block of d.content ?? []) {
        if (block?.type === "text" && typeof block.text === "string") parts.push(block.text);
        else if (block?.type === "tool_use") parts.push(toolMarker(block.name));
      }
      break;
    }
    case "image": {
      const count = Array.isArray(d.data) ? d.data.length : 0;
      parts.push(`[${count} image(s)]`);
      break;
    }
  }

  return { text: parts.join("\n"), providerResponseId: id };
}

/**
 * צובר טקסט מ-stream של SSE. מטפל בשורות שנחתכו בין chunks
 * (שומר את השארית עד שמגיע ה-"\n" הבא).
 */
export class SSEAnswerCollector {
  private buffer = "";
  private parts: string[] = [];
  private responseId?: string;

  constructor(private readonly api: RequestLogApi) {}

  push(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) this.handleLine(line);
  }

  result(): ExtractedAnswer {
    if (this.buffer) {
      this.handleLine(this.buffer);
      this.buffer = "";
    }
    return { text: this.parts.join(""), providerResponseId: this.responseId };
  }

  private handleLine(line: string): void {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;

    let event: Json;
    try {
      event = JSON.parse(payload);
    } catch {
      return;
    }

    switch (this.api) {
      case "chat":
        this.setId(event.id);
        for (const choice of event.choices ?? []) {
          const delta = choice?.delta;
          if (typeof delta?.content === "string") this.parts.push(delta.content);
          for (const call of delta?.tool_calls ?? []) this.addTool(call?.function?.name);
        }
        break;

      case "responses":
        this.setId(event.response?.id);
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          this.parts.push(event.delta);
        } else if (event.type === "response.output_item.added" && event.item?.type === "function_call") {
          this.addTool(event.item.name);
        }
        break;

      case "anthropic":
        if (event.type === "message_start") this.setId(event.message?.id);
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          this.parts.push(event.delta.text ?? "");
        } else if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
          this.addTool(event.content_block.name);
        }
        break;

      case "image":
        break;
    }
  }

  private setId(id: unknown): void {
    if (!this.responseId && typeof id === "string") this.responseId = id;
  }

  /** שם הכלי מגיע פעם אחת לכל קריאה (ב-chat: רק ב-delta הראשון שלה). */
  private addTool(name: unknown): void {
    if (typeof name !== "string") return;
    this.parts.push(`\n${toolMarker(name)}\n`);
  }
}
