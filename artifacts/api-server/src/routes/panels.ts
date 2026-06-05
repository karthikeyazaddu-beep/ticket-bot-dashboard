import { Router } from "express";
import { db } from "@workspace/db";
import { panelsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getClient } from "../bot";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from "discord.js";
import {
  ListPanelsQueryParams,
  CreatePanelBody,
  GetPanelParams,
  UpdatePanelParams,
  UpdatePanelBody,
  DeletePanelParams,
  SendPanelParams,
  SendPanelBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListPanelsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success && query.data.guildId) {
    conditions.push(eq(panelsTable.guildId, query.data.guildId));
  }
  const panels = await db.select().from(panelsTable).where(conditions.length ? and(...conditions) : undefined);
  res.json(panels.map(serializePanel));
});

router.post("/", async (req, res) => {
  const body = CreatePanelBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid body" });
  const [panel] = await db.insert(panelsTable).values({
    guildId: body.data.guildId,
    name: body.data.name,
    emoji: body.data.emoji,
    description: body.data.description,
    imageUrl: body.data.imageUrl,
    categoryId: body.data.categoryId,
    staffRoleIds: JSON.stringify(body.data.staffRoleIds || []),
    color: body.data.color,
    welcomeMessage: body.data.welcomeMessage,
  }).returning();
  res.status(201).json(serializePanel(panel));
});

router.get("/:id", async (req, res) => {
  const params = GetPanelParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const [panel] = await db.select().from(panelsTable).where(eq(panelsTable.id, params.data.id));
  if (!panel) return res.status(404).json({ error: "Panel not found" });
  res.json(serializePanel(panel));
});

router.patch("/:id", async (req, res) => {
  const params = UpdatePanelParams.safeParse({ id: Number(req.params.id) });
  const body = UpdatePanelBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid request" });
  const update: any = {};
  if (body.data.name !== undefined) update.name = body.data.name;
  if (body.data.emoji !== undefined) update.emoji = body.data.emoji;
  if (body.data.description !== undefined) update.description = body.data.description;
  if (body.data.imageUrl !== undefined) update.imageUrl = body.data.imageUrl;
  if (body.data.categoryId !== undefined) update.categoryId = body.data.categoryId;
  if (body.data.staffRoleIds !== undefined) update.staffRoleIds = JSON.stringify(body.data.staffRoleIds);
  if (body.data.color !== undefined) update.color = body.data.color;
  if (body.data.welcomeMessage !== undefined) update.welcomeMessage = body.data.welcomeMessage;
  const [panel] = await db.update(panelsTable).set(update).where(eq(panelsTable.id, params.data.id)).returning();
  if (!panel) return res.status(404).json({ error: "Panel not found" });
  res.json(serializePanel(panel));
});

router.delete("/:id", async (req, res) => {
  const params = DeletePanelParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  await db.delete(panelsTable).where(eq(panelsTable.id, params.data.id));
  res.status(204).send();
});

router.post("/:id/send", async (req, res) => {
  const params = SendPanelParams.safeParse({ id: Number(req.params.id) });
  const body = SendPanelBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid request" });
  const [panel] = await db.select().from(panelsTable).where(eq(panelsTable.id, params.data.id));
  if (!panel) return res.status(404).json({ error: "Panel not found" });
  const botClient = getClient();
  if (!botClient) return res.status(503).json({ error: "Bot not connected" });
  try {
    const channel = await botClient.channels.fetch(body.data.channelId) as TextChannel;
    const colorHex = panel.color ? parseInt(panel.color.replace("#", ""), 16) : 0x5865f2;
    const embed = new EmbedBuilder()
      .setColor(colorHex)
      .setTitle(`${panel.emoji} ${panel.name}`)
      .setDescription(panel.description);
    if (panel.imageUrl) embed.setImage(panel.imageUrl);
    const button = new ButtonBuilder()
      .setCustomId(`open_ticket_${panel.id}`)
      .setLabel(`${panel.emoji} Open Ticket`)
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    const msg = await channel.send({ embeds: [embed], components: [row] });
    res.json({ success: true, messageId: msg.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to send panel" });
  }
});

function serializePanel(p: any) {
  return {
    ...p,
    staffRoleIds: typeof p.staffRoleIds === "string" ? JSON.parse(p.staffRoleIds) : (p.staffRoleIds ?? []),
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

export default router;
