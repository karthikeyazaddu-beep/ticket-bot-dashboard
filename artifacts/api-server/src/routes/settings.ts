import { Router } from "express";
import { db } from "@workspace/db";
import { guildSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getClient } from "../bot";
import {
  GetSettingsParams,
  UpdateSettingsParams,
  UpdateSettingsBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/:guildId", async (req, res) => {
  const params = GetSettingsParams.safeParse({ guildId: req.params.guildId });
  if (!params.success) return res.status(400).json({ error: "Invalid guildId" });
  const [settings] = await db
    .select()
    .from(guildSettingsTable)
    .where(eq(guildSettingsTable.guildId, params.data.guildId));
  if (!settings) {
    return res.json({ guildId: params.data.guildId, logChannelId: null, transcriptChannelId: null });
  }
  res.json({
    guildId: settings.guildId,
    logChannelId: settings.logChannelId ?? null,
    transcriptChannelId: settings.transcriptChannelId ?? null,
  });
});

router.patch("/:guildId", async (req, res) => {
  const params = UpdateSettingsParams.safeParse({ guildId: req.params.guildId });
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid request" });
  const update: any = {};
  if (body.data.logChannelId !== undefined) update.logChannelId = body.data.logChannelId;
  if (body.data.transcriptChannelId !== undefined) update.transcriptChannelId = body.data.transcriptChannelId;
  const [settings] = await db
    .insert(guildSettingsTable)
    .values({ guildId: params.data.guildId, ...update })
    .onConflictDoUpdate({ target: guildSettingsTable.guildId, set: update })
    .returning();
  res.json({
    guildId: settings.guildId,
    logChannelId: settings.logChannelId ?? null,
    transcriptChannelId: settings.transcriptChannelId ?? null,
  });
});

export default router;
