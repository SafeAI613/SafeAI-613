import { Request, Response } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { estimateAnthropicTokens } from "../services/anthropicAdapter";
import { proxyAnthropicMessages} from "../services/proxyService";
import logger from "../logger";

export async function anthropicMessagesHandler(req: Request, res: Response) {
  try {
    const data = await proxyAnthropicMessages((req as any).user, req.body);

    if (req.body.stream && data instanceof ReadableStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.status(200);

      // res.send(ReadableStream) ב-Express 5 שולח "{}" — צריך pipe.
      // pipeline מטפל ב-backpressure ומבטל את ה-stream אם הלקוח מתנתק.
      await pipeline(
        Readable.fromWeb(data as NodeReadableStream<Uint8Array>),
        res,
      ).catch((err: Error) =>
        logger.error("Anthropic stream pipe error:", { error: err.message }),
      );
      return;
    }

    return res.status(200).json(data);
  } catch (error: any) {
    logger.error("Anthropic messages error:", {
      error: error.message,
      stack: error.stack,
    });

    if (
      error.message?.includes(
        "Content blocked By SafeAI Filter",
      )
    ) {
      return res.status(200).json({
        id: `msg_${Date.now()}`,
        type: "message",
        role: "assistant",
        model: req.body.model,
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
        },
      });
    }

    return res.status(500).json({
      type: "error",
      error: {
        type: "api_error",
        message:
          error.message ||
          "Anthropic messages request failed",
      },
    });
  }
}
export async function anthropicCountTokensHandler(req: Request, res: Response) {
  try {
    const result = estimateAnthropicTokens(req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Anthropic count_tokens error:", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      type: "error",
      error: {
        type: "api_error",
        message: error.message || "Token count failed",
      },
    });
  }
}

export async function anthropicModelsHandler(req: Request, res: Response) {
  return res.status(200).json({
    data: [
      {
        id: "claude-sonnet-4-6",
        type: "model",
        display_name: "Claude Sonnet 4.6 via SafeAI",
      },
      //   {
      //     id: "claude-3-5-sonnet-latest",
      //     type: "model",
      //     display_name: "Claude 3.5 Sonnet via SafeAI",
      //   },
      //   {
      //     id: "claude-3-5-haiku-latest",
      //     type: "model",
      //     display_name: "Claude 3.5 Haiku via SafeAI",
      //   },
    ],
  });
}
