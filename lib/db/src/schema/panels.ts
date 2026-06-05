import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const panelsTable = pgTable("panels", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🎫"),
  description: text("description").notNull().default("Open a ticket"),
  imageUrl: text("image_url"),
  categoryId: text("category_id"),
  staffRoleIds: text("staff_role_ids").notNull().default("[]"),
  color: text("color"),
  welcomeMessage: text("welcome_message"),
  ticketCount: integer("ticket_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPanelSchema = createInsertSchema(panelsTable).omit({ id: true, createdAt: true, ticketCount: true });
export type InsertPanel = z.infer<typeof insertPanelSchema>;
export type Panel = typeof panelsTable.$inferSelect;
