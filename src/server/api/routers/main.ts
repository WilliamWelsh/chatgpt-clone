import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/db";
import { messages, sessions } from "~/db/schema";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";

export const mainRouter = createTRPCRouter({
  getSessions: privateProcedure.query(async ({ ctx }) => {
    const history = await db
      .select({ id: sessions.id, name: sessions.name })
      .from(sessions)
      .where(eq(sessions.userId, ctx.userId))
      .orderBy(desc(sessions.updatedAt));

    return history.map((session) => ({
      id: session.id,
      name: session.name ?? "Untitled Session",
    }));
  }),

  createSession: privateProcedure
    .input(z.object({ question: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const newSession = await db.insert(sessions).values({
        userId: ctx.userId,
        name: input.question.substring(0, 20),
        updatedAt: new Date(),
      });

      const sessionId = +newSession.insertId;

      // Add this message to the session
      const newMessage = await db.insert(messages).values({
        sessionId: +newSession.insertId,
        role: "user",
        content: input.question,
      });

      const message = await db
        .select()
        .from(messages)
        .where(eq(messages.id, +newMessage.insertId))
        .limit(1);

      return { sessionId, message: message[0] };
    }),

  deleteSession: privateProcedure
    .input(z.object({ sessionId: z.number().nullish() }))
    .mutation(async ({ input }) => {
      if (!input.sessionId) return;

      await db
        .delete(messages)
        .where(and(eq(messages.sessionId, input.sessionId)));
      await db.delete(sessions).where(eq(sessions.id, input.sessionId));
    }),

  deleteAllSessions: privateProcedure.mutation(async ({ ctx }) => {
    const sessionIds = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, ctx.userId));

    await Promise.all(
      sessionIds.map(async (session) => {
        await db.delete(messages).where(eq(messages.sessionId, session.id));
        await db.delete(sessions).where(eq(sessions.id, session.id));
      })
    );
  }),

  getSessionMessages: privateProcedure
    .input(z.object({ sessionId: z.number().nullish() }))
    .mutation(async ({ input }) => {
      if (!input.sessionId) return [];

      const history = await db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, input.sessionId))
        .orderBy(asc(messages.createdAt));

      return history;
    }),

  addMessage: privateProcedure
    .input(
      z.object({
        sessionId: z.number().nullish(),
        role: z.union([z.literal("bot"), z.literal("user")]),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.sessionId) return;

      await db.insert(messages).values({
        role: input.role,
        content: input.content,
        sessionId: input.sessionId,
      });
    }),
});
