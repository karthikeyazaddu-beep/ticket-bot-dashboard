import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tryoutResultsTable = pgTable("tryout_results", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  targetUserId: text("target_user_id").notNull(),
  targetUserName: text("target_user_name").notNull(),
  tryouterUserId: text("tryouter_user_id").notNull(),
  tryouterUserName: text("tryouter_user_name").notNull(),
  aim: text("aim").notNull(),
  movement: text("movement").notNull(),
  skillLevel: text("skill_level").notNull(),
  rank: text("rank").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTryoutResultSchema = createInsertSchema(tryoutResultsTable).omit({ id: true, createdAt: true });
export type InsertTryoutResult = z.infer<typeof insertTryoutResultSchema>;
export type TryoutResult = typeof tryoutResultsTable.$inferSelect;
