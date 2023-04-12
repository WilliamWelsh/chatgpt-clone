/* eslint-disable import/no-anonymous-default-export */
import { type NextApiRequest, type NextApiResponse } from "next";
import {
  type ChatCompletionRequestMessage,
  type CreateChatCompletionRequest,
} from "openai";
import { env } from "../../env.mjs";
import { messages, sessions } from "~/db/schema";
import { eq } from "drizzle-orm";
import { db } from "~/db/db";
import { getAuth } from "@clerk/nextjs/server.js";

export default async (req: NextApiRequest, _: NextApiResponse) => {
  if (!req.url) throw new Error("No request URL provided");

  const { searchParams } = new URL(req.url);

  const sessionId = searchParams.get("sessionId");

  if (!sessionId) throw new Error("No sessionId provided");

  const { userId } = getAuth(req);

  const session = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, +sessionId))
    .limit(1);

  if (session[0] && session[0].userId !== userId)
    throw new Error("Unauthorized");

  const history = (
    await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.sessionId, +sessionId))
  ).map((msg) => ({
    ...msg,
    role: msg.role?.replace("bot", "system"),
  })) as ChatCompletionRequestMessage[];

  const request: CreateChatCompletionRequest = {
    model: "gpt-3.5-turbo",
    max_tokens: 1024,
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "You are a clone of ChatGPT. You are made with Drizzle ORM, TypeScript, tRPC, NextJS, OpenAI API, and hosted on Vercel. If the answer involves code or terminal commands, always use markdown and/or markdown codeblocks",
      },
      ...history,
    ],
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify(request),
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream" },
  });
};

export const config = { runtime: "edge" };
