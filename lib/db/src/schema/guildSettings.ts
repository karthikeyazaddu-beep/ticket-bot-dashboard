import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guildSettingsTable = pgTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  logChannelId: text("log_channel_id"),
  transcriptChannelId: text("transcript_channel_id"),
  tryoutChannelId: text("tryout_channel_id"),
  tryoutRoles: text("tryout_roles").default("[]"),
  entryChannelId: text("entry_channel_id"),
  entryRoleId: text("entry_role_id"),
  bracketChannelId: text("bracket_channel_id"),
  tournamentChannelId: text("tournament_channel_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGuildSettingsSchema = createInsertSchema(guildSettingsTable);
export type InsertGuildSettings = z.infer<typeof insertGuildSettingsSchema>;
export type GuildSettings = typeof guildSettingsTable.$inferSelect;
