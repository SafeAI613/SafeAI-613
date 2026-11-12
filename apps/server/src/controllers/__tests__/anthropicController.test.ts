/**
 * תשובת stream של Anthropic חייבת לעבור ללקוח כ-SSE.
 * (באג קודם: res.send(ReadableStream) ב-Express 5 שלח "{}".)
 */

const mockProxy = jest.fn();

jest.mock("../../services/proxyService", () => ({
  proxyAnthropicMessages: (...args: unknown[]) => mockProxy(...args),
}));
jest.mock("../../logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

import express from "express";
import request from "supertest";
import { anthropicMessagesHandler } from "../anthropicController";

const app = express();
app.use(express.json());
app.post("/v1/messages", anthropicMessagesHandler);

describe("anthropicMessagesHandler", () => {
  it("pipes a stream response as SSE", async () => {
    const sse = 'event: message_start\ndata: {"type":"message_start"}\n\n';
    mockProxy.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(sse));
          c.close();
        },
      }),
    );

    const res = await request(app).post("/v1/messages").send({ stream: true });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.text).toBe(sse);
  });

  it("returns JSON for a non-stream response", async () => {
    mockProxy.mockResolvedValue({ id: "foo", content: [] });

    const res = await request(app).post("/v1/messages").send({ stream: false });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "foo", content: [] });
  });
});
