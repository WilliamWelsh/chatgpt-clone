import { type InferModel } from "drizzle-orm";
import {
  int,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/mysql-core";

export const sessions = mysqlTable("sessions", {
  id: serial("id").primaryKey(),
  name: text("name"),
  userId: text("user_id"),
  updatedAt: timestamp("updated_at").onUpdateNow(),
});

export const messages = mysqlTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content"),
  sessionId: int("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
  role: mysqlEnum("role", ["user", "bot"]),
});

export type Session = InferModel<typeof sessions>;
export type Message = InferModel<typeof messages>;
