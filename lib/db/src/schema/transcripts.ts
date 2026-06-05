import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transcriptsTable = pgTable("transcripts", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().unique(),
  messages: text("messages").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTranscriptSchema = createInsertSchema(transcriptsTable).omit({ id: true, createdAt: true });
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcriptsTable.$inferSelect;
