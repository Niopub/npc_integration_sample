---
name: client-skill
description: Build game clients that connect players to AI NPCs via the Niopub Intelligence Engine. Covers player sessions, HTTP streaming, and WebSocket events using the distribution key.
---

# Niopub Client Integration

Connect players to AI companions that understand context, remember state, and respond intelligently. This skill covers the client-facing API using the distribution key.

## Required Env Vars

| Var | Required | Purpose |
|-----|----------|---------|
| `DISTR_KEY` | yes | Auth for player create and all stream events |

If missing, ask the user to provide it. Keys come from support@niopub.com.

## API Base

`https://n10s.net`

## Auth

Every request requires these headers:

```
Authorization: Bearer <DISTR_KEY>
Content-Type: application/json
product: niopub
```

## Flow

1. Create Player → 2. Stream Events (state and/or ask)

---

## Players

Create player sessions within a simulation. The simulation and NPCs must already exist (see admin-skill).

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/user/player` | DISTR_KEY | `{ "sim_id": "<string>", "expire_min?": <int> }` |

Response shape: `{ "player_id", "sim_id", "created_on", "connected_from", "expires_on" }`

## Stream Events (HTTP)

Rate limit: 30/min per player.

**State event** — contextual game state update NPCs observe:
```json
POST /stream/event
{
  "player_id": "<string>",
  "sim_id": "<string>",
  "event_kind": "state",
  "event": "<short natural-language, 5-8 words>"
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
WSS wss://n10s.net/stream/event/ws/{sim_id}/{player_id}

Headers:
  Authorization: Bearer <DISTR_KEY>
  product: niopub
```

**Send state:** `{ "event_kind": "state", "event": "<text>" }`
**Send ask:** `{ "event_kind": "ask", "npc_id": "<id>", "ask_text": "<text>", "ask_id": "<optional>" }`
**Receive resp:** `{ "event_kind": "resp", "npc_id": "<responding NPC>", "ask_id": "<correlation>", "resp_text": "<answer>" }`
**Close:** `{ "cmd": "close" }`

---

## Best Practices

### Error Handling
- HTTP errors return `{ "detail": "<message>" }` with the HTTP status code
- WebSocket errors return `{ "err": "<message>", "status_code": <int> }`
- Handle: 400 (bad input), 401 (bad/missing key), 403 (tier limit), 404 (not found), 429 (rate limited)

### Rate Limits
- HTTP `/stream/event`: 30/min per player — space requests >=2s apart
- WebSocket: 60/min per player — space messages >=1s apart
- On 429: drop the event. Do not queue or retry.

### Event Validation (validate client-side before sending)
- All events require non-empty `player_id` and `sim_id`
- State events: `event` must be exactly 5–8 space-separated words
- Ask events: `npc_id` and `ask_text` are required and non-empty. `ask_text` max 420 characters.
- `ask_id` is optional (auto-generated if omitted), max 18 characters if provided
- Trim whitespace on all fields. Reject empty strings locally rather than round-tripping to the server.

### Security
- Never expose `DISTR_KEY` in browser or client-side code
- Load from environment variables or a secrets manager. Never hardcode.

---

## Client Construction Directives

When building a client, follow these architectural rules.

### Mode Selection

Ask the user which client mode to build:
1. **HTTP** — all events via HTTPS requests
2. **WebSocket** — all events via a persistent WebSocket connection
3. **Hybrid** — state events via WebSocket, ask events via HTTPS

### Constructor

Parameters: `sim_id`, `distr_key`, mode (`http` | `websocket` | `hybrid`), optional `player_name`.

- If `player_name` is provided: create a **persistent player** (no expiry) via `POST /user/player` with body `{ "sim_id": "<sim_id>" }`. Store the returned `player_id` locally (e.g. `.nio_players.json`) keyed by `player_name`, so the same player is reused on restart. On startup, check the local store first before creating a new player.
- If `player_name` is omitted: create a **temporary player** with `{ "sim_id": "<sim_id>", "expire_min": 180 }` (3-hour expiry).

### Public API (3 methods)

```
state(event_text: string) -> void       # send a state event (blocking, raises on error)
ask(npc_id: string, ask_text: string) -> string  # send an ask, return NPC response text (blocking)
shutdown() -> void                      # close WebSocket if open, release resources
```

### HTTP Mode

- `state()` → `POST /stream/event` with `event_kind: "state"`. Returns on HTTP 200.
- `ask()` → `POST /stream/event` with `event_kind: "ask"`. The server blocks up to 25s waiting for the NPC response. Returns `{ "ask_id": "<id>", "response": "<text>" }`. Return the `response` field as a string.

### WebSocket Mode

- On the first `state()` or `ask()` call, open a WebSocket connection to `wss://n10s.net/stream/event/ws/{sim_id}/{player_id}` with auth headers. Keep it alive for the life of the client.
- `state()` → send `{ "event_kind": "state", "event": "<text>" }` on the WebSocket. Returns when the send completes.
- `ask()` → generate a unique `ask_id` (max 18 chars). Send `{ "event_kind": "ask", "npc_id": "<id>", "ask_text": "<text>", "ask_id": "<generated>" }` on the WebSocket. Then **block** reading the WebSocket receive channel until a message arrives with `event_kind: "resp"` and a matching `ask_id`. The response shape is:
  ```json
  { "event_kind": "resp", "npc_id": "<responding NPC>", "ask_id": "<correlation>", "resp_text": "<answer>" }
  ```
  Return the `resp_text` field. Timeout after 30 seconds if no matching response arrives.

### Hybrid Mode

- State events via WebSocket (connection opened on first `state()` call).
- Ask events via HTTP `POST /stream/event` (blocking, response returned directly as in HTTP mode).

### Rate Limit Behavior

On HTTP 429 or WebSocket `{ "status_code": 429 }`, **drop the event**. Do not queue or retry. Surface the failure to the caller by raising an error or returning an error status.

### WebSocket Lifecycle

- Handle close codes: `4010` (unauthorized or expired), `4000` (general error), `4005` (not allowed)
- `shutdown()` sends `{ "cmd": "close" }` before disconnecting cleanly
- Do not auto-reconnect silently. Surface connection failures to the caller.

---

## Post-Creation: Testing

After building the client library, integrate with the codebase's existing test suite to verify the 4 core operations. Write tests that run against the live API (not mocked) using a real `DISTR_KEY` and `sim_id`.

### What to Test

1. **Create instance** — construct the client, confirm a `player_id` is returned and stored. If using `player_name`, confirm the player is persisted locally and reused on a second instantiation.
2. **`state()`** — send a valid state event (5–8 words). Confirm it returns without error (HTTP 200 or WebSocket send success).
3. **`ask()`** — send an ask to a known `npc_id`. Confirm a non-empty string response is returned within 30 seconds.
4. **`shutdown()`** — close the client. Confirm WebSocket is disconnected (if applicable) and no resources leak.

### Test Structure

- Use the codebase's existing test runner and conventions (e.g. Jest, pytest, Go testing, etc.). Do not introduce a new test framework.
- Tests must be sequential: create instance → state → ask → shutdown. Each step depends on the previous.
- Load `DISTR_KEY` and `sim_id` from environment variables. Skip the test suite gracefully if either is missing, with a clear message indicating the required vars.
- Use a temporary player (no `player_name`) so each test run gets a fresh session.
- Assert on: HTTP status codes, non-empty response fields, response shape (`ask` returns a string), and no thrown exceptions for valid inputs.
- Include one negative test: send a state event with fewer than 5 words and confirm the server returns 400.

---

## Post-Creation: Event Instrumentation

After the client is built and tested, instrument the codebase to send state events as the application runs. State events are how NPCs stay contextually aware of what the player or user is doing — think of them like log statements or analytics events, but written in natural language for AI consumption.

### What State Events Represent

A state event is a **5–8 word natural-language snapshot** of something that just happened. NPCs observe these passively and use them to inform future conversations. Examples by category:

| Category | Example events |
|----------|---------------|
| Navigation | `player entered dark forest zone`, `player reached the mountain summit` |
| Combat | `player attacked goblin with sword`, `critical hit landed on boss` |
| Inventory | `player picked up iron sword`, `rare gem found in chest` |
| Stats | `strength increased to level 12`, `player leveled up to 30` |
| Environment | `rain started affecting movement speed`, `daytime cycle shifted to night` |
| Social | `dialogue started with tavern keeper`, `player joined the archer guild` |
| Quests | `quest updated find the elder`, `objective complete rescued village merchant` |
| Achievements | `player completed first dungeon today`, `player survived first major boss` |
| Status effects | `player health at 5 percent`, `poison removed with antidote today` |
| Economy | `sold 10 pelts to merchant`, `bounty claimed for outlaw capture` |

### Where to Place Events

Identify locations in the codebase where meaningful state changes occur. These are the same places you would typically put a log statement or fire an analytics event:

- **Scene/screen transitions** — when the user moves between areas, views, or game zones
- **User actions** — purchases, crafting, equipping, combat actions, dialogue choices
- **System state changes** — health/mana changes, level ups, quest progress updates, status effects applied or removed
- **Environment changes** — time of day, weather, new areas unlocked
- **Social interactions** — NPC conversations, party changes, faction reputation shifts

### How to Instrument

1. Import or reference the client instance wherever state changes happen.
2. Call `state("<5-8 word description>")` at each instrumentation point. The call is fire-and-forget — do not await the result or block the main thread on it.
3. Write events in **third person, past tense or present snapshot** form: describe what happened or what is now true, not what might happen.
4. Keep events factual and specific. `player health at 10 percent` is better than `player is low on health`. `player entered dark forest zone` is better than `player moved`.
5. Do not send events on every frame or tick. Send them on **discrete transitions**: when a value crosses a threshold, when a screen loads, when an action completes. One event per meaningful state change.
6. Respect rate limits (HTTP: 30/min, WebSocket: 60/min). If the application generates events faster than the limit, prioritize high-signal events (combat, quests, major state changes) over low-signal ones (minor movement, routine stat ticks).
