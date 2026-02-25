<!--
  Install: copy this folder into your project at .claude/skills/nio-npc/
  or into ~/.claude/skills/nio-npc/ for personal use across all projects.
-->
---
name: nio-npc
description: Niopub Simulation API reference for AI companions and NPCs. Covers auth, simulations, NPCs, players, and stream events (HTTP + WebSocket). Use when integrating AI NPCs, calling the Simulation API, or building on the Niopub platform.
---

# Niopub Simulation API

Add AI companions or NPCs to apps and games. Players talk to characters that understand context, remember state, and respond intelligently.

## Required Env Vars

Before making any API call, confirm these are set (e.g. in `.env` or shell environment):

| Var | Required | Purpose |
|-----|----------|---------|
| `BASE_URL` | yes | API base (e.g. `https://n10s.net`) |
| `API_KEY` | yes | Auth for simulation, NPC, and player read/delete |
| `DISTR_KEY` | yes | Auth for player create and all stream events |

If any are missing, ask the user to provide them. Keys come from support@niopub.com.

## Auth

Every request requires these headers:

```
Authorization: Bearer <API_KEY or DISTR_KEY>
Content-Type: application/json
```

**API_KEY** — simulation CRUD, NPC CRUD, player list/get/delete.
**DISTR_KEY** — player create, all stream event operations.

## Flow

1. Create Simulation → 2. Add NPCs → 3. Register Players → 4. Stream Events

---

## Simulations

A simulation is your game world or app context. There are tier based limits to how many simulations you can create for your account.

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/simulation` | API_KEY | `{ "name": "<string>" }` |
| GET | `/simulation` | API_KEY | — (lists all) |
| GET | `/simulation/{sim_id}` | API_KEY | — |
| PUT | `/simulation/{sim_id}` | API_KEY | `{ "lore": "<string, max 2000 words>" }` |
| DELETE | `/simulation` | API_KEY | `{ "sim_id": "<string>" }` |

Response shape: `{ "sim_id", "name", "lore", "creation_time" }`

**Delete:** All NPCs in the simulation must be deleted before the simulation itself can be deleted.

## NPCs

Characters inside a simulation with personality, description, and interests. There are tier based limits to how many NPCs you can create per simulation for your account.

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/npc` | API_KEY | see below |
| GET | `/simulation/{sim_id}/npcs` | API_KEY | — (lists all in sim) |
| GET | `/npc/{npc_id}` | API_KEY | — |
| PUT | `/npc/{npc_id}` | API_KEY | `{ "description?", "interests?" }` |
| DELETE | `/npc` | API_KEY | `{ "npc_id": "<string>" }` |

**Create NPC body:**
```json
{
  "sim_id": "<string>",
  "npc_name": "<string>",
  "description": "<character personality, role, behavior>",
  "interests": ["<5 phrases, 5-8 words each>"]
}
```

Response shape: `{ "npc_id", "sim_id", "description", "curr_interest_raw", "creation_time", "update_time" }`

## Players

Player sessions within a simulation.

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/user/player` | DISTR_KEY | `{ "sim_id": "<string>", "expire_min?": <int> }` |
| GET | `/user/players?sim_id={sim_id}` | API_KEY | — (lists all) |
| GET | `/user/player/{player_id}?sim_id={sim_id}` | API_KEY | — |
| DELETE | `/user/player` | API_KEY | `{ "player_id": "<string>", "sim_id": "<string>" }` |

Response shape: `{ "player_id", "sim_id", "created_on", "connected_from", "expires_on" }`

## Stream Events (HTTP)

All event operations use **DISTR_KEY**. Rate limit: 30/min per player.

**State event** — contextual game state update NPCs observe:
```json
POST /stream/event
{
  "player_id": "<string>",
  "sim_id": "<string>",
  "event_kind": "state",
  "event": "<short natural-language, 5-8 words>",
  "event_id": "<optional, for dedup>"
}
```

**Ask event** — player asks a specific NPC a question:
```json
POST /stream/event
{
  "player_id": "<string>",
  "sim_id": "<string>",
  "event_kind": "ask",
  "npc_id": "<string>",
  "ask_text": "<player's question>",
  "ask_id": "<optional, for correlation>"
}
```

Ask response: `{ "ask_id", "response": "<NPC's answer>" }`

## Stream Events (WebSocket)

For high-frequency streaming. Rate limit: 60/min per player.

**Connect:**
```
WSS {BASE_URL}/stream/event/ws/{sim_id}/{player_id}

Headers:
  Authorization: Bearer <DISTR_KEY>
```

**Send state:** `{ "event_kind": "state", "event": "<text>" }`
**Send ask:** `{ "event_kind": "ask", "npc_id": "<id>", "ask_text": "<text>" }`
**Close:** `{ "cmd": "close" }`
