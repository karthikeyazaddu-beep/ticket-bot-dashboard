import { Router } from "express";
import { db } from "@workspace/db";
import { ticketsTable, transcriptsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListTicketsQueryParams,
  GetTicketParams,
  GetTicketStatsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/stats", async (req, res) => {
  const query = GetTicketStatsQueryParams.safeParse(req.query);
  const guildId = query.success ? query.data.guildId : undefined;
  const conditions = guildId ? [eq(ticketsTable.guildId, guildId)] : [];

  const allTickets = await db.select().from(ticketsTable).where(conditions.length ? and(...conditions) : undefined);
  const total = allTickets.length;
  const open = allTickets.filter(t => t.status === "open").length;
  const closed = allTickets.filter(t => t.status === "closed").length;

  const panelMap = new Map<number, { panelId: number; panelName: string; panelEmoji: string; count: number }>();
  for (const t of allTickets) {
    const existing = panelMap.get(t.panelId);
    if (existing) {
      existing.count++;
    } else {
      panelMap.set(t.panelId, { panelId: t.panelId, panelName: t.panelName, panelEmoji: t.panelEmoji, count: 1 });
    }
  }

  res.json({ total, open, closed, byPanel: Array.from(panelMap.values()) });
});

router.get("/", async (req, res) => {
  const query = ListTicketsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success) {
    if (query.data.guildId) conditions.push(eq(ticketsTable.guildId, query.data.guildId));
    if (query.data.status) conditions.push(eq(ticketsTable.status, query.data.status));
    if (query.data.panelId) conditions.push(eq(ticketsTable.panelId, Number(query.data.panelId)));
  }
  const tickets = await db.select().from(ticketsTable).where(conditions.length ? and(...conditions) : undefined);
  res.json(tickets.map(serializeTicket));
});

router.get("/:id", async (req, res) => {
  const params = GetTicketParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.id));
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  const [transcript] = await db.select().from(transcriptsTable).where(eq(transcriptsTable.ticketId, ticket.id));
  res.json({
    ...serializeTicket(ticket),
    transcript: transcript ? serializeTranscript(transcript) : null,
  });
});

function serializeTicket(t: any) {
  return {
    ...t,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    closedAt: t.closedAt instanceof Date ? t.closedAt.toISOString() : (t.closedAt ?? null),
  };
}

function serializeTranscript(t: any) {
  return {
    id: t.id,
    ticketId: t.ticketId,
    messages: typeof t.messages === "string" ? JSON.parse(t.messages) : (t.messages ?? []),
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
  };
}

export default router;
