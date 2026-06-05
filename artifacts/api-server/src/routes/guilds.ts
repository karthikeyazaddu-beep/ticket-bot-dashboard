import { Router } from "express";
import { getClient } from "../bot";

const router = Router();

router.get("/", async (_req, res) => {
  const botClient = getClient();
  if (!botClient) return res.json([]);
  const guilds = botClient.guilds.cache.map(g => ({
    id: g.id,
    name: g.name,
    iconUrl: g.iconURL() ?? null,
    memberCount: g.memberCount ?? null,
  }));
  res.json(guilds);
});

export default router;
