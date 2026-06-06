import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tournamentsTable = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  region: text("region"),
  rankCap: text("rank_cap"),
  prize: text("prize"),
  type: text("type").notNull().default("normal"), // flash or normal
  maxEntries: integer("max_entries").notNull().default(16),
  status: text("status").notNull().default("open"), // open, closed, active, completed
  entryChannelId: text("entry_channel_id"),
  bracketChannelId: text("bracket_channel_id"),
  bracketMessageId: text("bracket_message_id"),
  createdById: text("created_by_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

export const insertTournamentSchema = createInsertSchema(tournamentsTable).omit({ id: true, createdAt: true, startedAt: true, endedAt: true });
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournamentsTable.$inferSelect;

export const tournamentEntriesTable = pgTable("tournament_entries", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar"),
  seed: integer("seed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTournamentEntrySchema = createInsertSchema(tournamentEntriesTable).omit({ id: true, createdAt: true });
export type InsertTournamentEntry = z.infer<typeof insertTournamentEntrySchema>;
export type TournamentEntry = typeof tournamentEntriesTable.$inferSelect;

export const tournamentMatchesTable = pgTable("tournament_matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  round: integer("round").notNull(),
  matchNumber: integer("match_number").notNull(),
  player1Id: text("player1_id"),
  player1Name: text("player1_name"),
  player2Id: text("player2_id"),
  player2Name: text("player2_name"),
  winnerId: text("winner_id"),
  winnerName: text("winner_name"),
  threadId: text("thread_id"),
  status: text("status").notNull().default("pending"), // pending, active, completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTournamentMatchSchema = createInsertSchema(tournamentMatchesTable).omit({ id: true, createdAt: true });
export type InsertTournamentMatch = z.infer<typeof insertTournamentMatchSchema>;
export type TournamentMatch = typeof tournamentMatchesTable.$inferSelect;
