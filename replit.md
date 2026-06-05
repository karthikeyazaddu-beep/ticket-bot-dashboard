# Ticket Bot Dashboard

A Discord ticket management system with a web dashboard and a Discord bot.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Discord bot (port 8080)
- `pnpm --filter @workspace/ticket-dashboard run dev` — run the dashboard frontend (port 23569)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `DISCORD_BOT_TOKEN` — Discord bot token (secret)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/ticket-dashboard)
- API: Express 5 (artifacts/api-server)
- Bot: discord.js v14 (runs inside api-server on startup)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle schema (panels, tickets, transcripts, guildSettings)
- `artifacts/api-server/src/bot/index.ts` — Discord bot logic
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/ticket-dashboard/src/` — React dashboard frontend

## Bot Commands (prefix: $)

All commands only work inside an active ticket channel:

- `$rename <name>` — rename the ticket channel
- `$add @user` — add a user to the ticket
- `$remove @user` — remove a user from the ticket
- `$escalate` — show escalation embed with panel buttons
- `$delete` — save transcript, log to log channel, delete channel

## Product

- **Dashboard** — manage panels, view tickets, read transcripts, configure settings per guild
- **Panels** — each panel has emoji, name, description, image, category, staff roles, accent color, welcome message
- **Tickets** — opened via button click on panel embed; one ticket per user per panel
- **Escalation** — moves ticket to a different panel's staff, updates permissions
- **Transcripts** — full message history saved on delete, linked in log channel
- **Send panel** — from the dashboard, send a panel embed + open-ticket button to any channel

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Bot token is read from DISCORD_BOT_TOKEN env secret at server startup
- DB push required after schema changes: `pnpm --filter @workspace/db run push`
- After OpenAPI spec changes, run codegen before using types
- The bot and API share the same process (api-server)
- staffRoleIds is stored as a JSON string in the DB; serialized/deserialized in routes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
