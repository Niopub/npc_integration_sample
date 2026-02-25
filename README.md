# NPC Integration Sample

Sample integration for the [Niopub](https://niopub.com) Simulation API — simulations, NPCs, players, and stream events. API docs: [niopub.com/simulations/](https://niopub.com/simulations/)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your API keys from niopub.com
```

### AI skill (optional)

To add the Niopub API reference as a local skill for your AI editor:

```bash
# Claude Code
cp -r .claude/skills/nio-npc ~/.claude/skills/

# Cursor
cp -r .claude/skills/nio-npc ~/.cursor/skills/
```

## Flow order

1. Simulation operations (`simulation.ts`)
2. NPC operations (`npc.ts`)
3. Player operations (`player.ts`)
4. Stream event operations (`event.ts`)

## Prerequisites

- `.env` with: `API_KEY`, `DISTR_KEY`

## Quick examples

```bash
# 1) simulation
npx tsx simulation.ts create "My Game"
npx tsx simulation.ts list
npx tsx simulation.ts get si123...

# 2) npc
npx tsx npc.ts create si123...                    # lists available preset profiles
npx tsx npc.ts create si123... combat_specialist  # create using one preset
npx tsx npc.ts list si123...
npx tsx npc.ts get npc123...
npx tsx npc.ts delete npc123...

# 3) player
npx tsx player.ts create si123... 5
npx tsx player.ts list si123...
npx tsx player.ts get pl123... si123...
npx tsx player.ts delete pl123... si123...

# 4) stream event - HTTP
npx tsx event.ts state pl123... si123... "player entered dark forest zone"
npx tsx event.ts ask pl123... si123... npc123... "what should i do next?"

# 4b) stream event - WebSocket (random events from data/game_events.json)
npx tsx event.ts stream pl123... si123...         # default 3000ms (~20/min)
npx tsx event.ts stream pl123... si123... 1500    # 1500ms (~40/min, warns)
```

## Data files

- `data/game_events.json` — 1000+ game state event strings (5–8 words, natural language with optional numbers). Used by `stream` mode to send random events.
- `data/npc_interests.json` — 10 NPC preset profiles for `npc.ts create`, each containing:
  - `name` (human-like display name)
  - one `description` text blob (role + behavior + character arc in one field)
  - exactly 5 validated interest phrases (5–8 words each)

