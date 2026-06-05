import { Router } from "express";
import { db } from "@workspace/db";
import { transcriptsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetTranscriptParams } from "@workspace/api-zod";

const router = Router();

router.get("/:ticketId", async (req, res) => {
  const params = GetTranscriptParams.safeParse({ ticketId: Number(req.params.ticketId) });
  if (!params.success) return res.status(400).json({ error: "Invalid ticketId" });
  const [transcript] = await db
    .select()
    .from(transcriptsTable)
    .where(eq(transcriptsTable.ticketId, params.data.ticketId));
  if (!transcript) return res.status(404).json({ error: "Transcript not found" });
  res.json({
    id: transcript.id,
    ticketId: transcript.ticketId,
    messages: typeof transcript.messages === "string" ? JSON.parse(transcript.messages) : (transcript.messages ?? []),
    createdAt: transcript.createdAt instanceof Date ? transcript.createdAt.toISOString() : transcript.createdAt,
  });
});

export default router;
