---
name: admin-skill
description: Manage Niopub Intelligence Engine simulations, NPCs, and player sessions. Covers full CRUD for game worlds and AI characters using the API key.
metadata:
  internal: true
---

# Niopub Admin API

Create and manage simulations, NPCs, and player sessions. This skill covers the admin/management API using the API key. All operations are HTTPS only.

## Required Env Vars

| Var | Required | Purpose |
|-----|----------|---------|
| `API_KEY` | yes | Auth for simulation, NPC, and player read/delete |

If missing, ask the user to provide it. Keys come from support@niopub.com.

## API Base

`https://n10s.net`

## Auth

Every request requires these headers:

```
Authorization: Bearer <API_KEY>
Content-Type: application/json
product: niopub
```

## Flow

1. Create Simulation → 2. Add NPCs → 3. Manage Players

---

## Simulations

A simulation is your game world or app context. There are tier-based limits to how many simulations you can create for your account.

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

Characters inside a simulation with personality, description, and interests. There are tier-based limits to how many NPCs you can create per simulation for your account.

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/npc` | API_KEY | see below |
| GET | `/npcs/{sim_id}` | API_KEY | — (lists all in sim) |
| GET | `/npc/{npc_id}` | API_KEY | — |
| PUT | `/npc/{npc_id}` | API_KEY | `{ "description?", "interests?" }` |
| DELETE | `/npc` | API_KEY | `{ "npc_id": "<string>" }` |

**Create NPC body:**
```json
{
  "sim_id": "<string>",
  "npc_name": "<string>",
  "description": "<character personality, role, behavior>",
  "interests": ["<up to 5 phrases, 5-8 words each>"]
}
```

Response shape: `{ "npc_name", "npc_id", "sim_id", "description", "curr_interest_raw", "creation_time", "update_time" }`

## Players

Manage player sessions within a simulation.

| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/user/players?sim_id={sim_id}` | API_KEY | — (lists all) |
| GET | `/user/player/{player_id}?sim_id={sim_id}` | API_KEY | — |
| DELETE | `/user/player` | API_KEY | `{ "player_id": "<string>", "sim_id": "<string>" }` |

Response shape: `{ "player_id", "sim_id", "created_on", "connected_from", "expires_on" }`

---

## Best Practices

### Error Handling
- Errors return `{ "detail": "<message>" }` with the HTTP status code
- Handle: 400 (bad input), 401 (bad/missing key), 403 (tier limit reached), 404 (not found), 409 (conflict)

### Input Validation (validate client-side before sending)

**Simulation name:**
- Required, non-empty after trimming whitespace

**Simulation lore:**
- Max 2000 words

**NPC name (`npc_name`):**
- 4–32 characters
- Alphanumeric and spaces only (`A-Z`, `a-z`, `0-9`, space)
- No special characters or punctuation

**NPC description:**
- Max 1000 words
- Free-form text (personality, role, behavior)

**NPC interests:**
- Up to 5 phrases
- Each phrase must be 5–8 words
- Duplicates are automatically removed (case-insensitive)

**Delete simulation:**
- All NPCs must be deleted first. Attempting to delete a simulation with NPCs returns 409.

### Security
- Never expose `API_KEY` in browser or client-side code
- Load from environment variables or a secrets manager. Never hardcode.
- `API_KEY` grants full admin access — treat it as a secret.

---

## Admin Tool Construction Directives

When building an admin tool or backend integration, follow these architectural rules.

### Tool Structure

Build an HTTPS-only client. All operations are request/response — no WebSocket connections needed.

### Constructor

Parameters: `api_key`, optional `base_url` (defaults to `https://n10s.net`).

- Constructor should validate that `api_key` is non-empty
- Store auth headers once: `Authorization: Bearer <api_key>`, `Content-Type: application/json`, `product: niopub`

### Public API

Expose thin wrappers over the REST endpoints. Each method makes one HTTPS request and returns the parsed JSON response or raises on error.

```
# Simulations
create_simulation(name: string) -> Simulation
list_simulations() -> List[Simulation]
get_simulation(sim_id: string) -> Simulation
update_simulation_lore(sim_id: string, lore: string) -> Simulation
delete_simulation(sim_id: string) -> void

# NPCs
create_npc(sim_id: string, npc_name: string, description: string, interests?: List[string]) -> NPC
list_npcs(sim_id: string) -> List[NPC]
get_npc(npc_id: string) -> NPC
update_npc(npc_id: string, description?: string, interests?: List[string]) -> NPC
delete_npc(npc_id: string) -> void

# Players
list_players(sim_id: string) -> List[Player]
get_player(player_id: string, sim_id: string) -> Player
delete_player(player_id: string, sim_id: string) -> void
```

### Error Handling

- On 4xx errors, parse `{ "detail": "<message>" }` and surface the message to the caller
- On 403 with tier limit messages, inform the user they've hit their account limit
- On 409 (delete simulation with NPCs), inform the user which NPCs need to be deleted first
- Do not retry on errors — surface them immediately

### Deletion Order

When deleting a simulation and all its resources:
1. List all NPCs in the simulation
2. Delete each NPC
3. Delete the simulation

Never attempt to delete a simulation without first removing its NPCs.
