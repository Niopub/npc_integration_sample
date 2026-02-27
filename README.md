# nio-skills

AI editor skills for the [Niopub](https://niopub.com) Intelligence Engine API — add AI companions and NPCs to apps and games.

## Installation

```bash
npx skills add niopub/nio-skills
```

Installs **client-skill** by default. Supports Claude Code, Cursor, OpenCode and more.

### Admin skill

To also install the admin skill (simulation/NPC management):

```bash
npx skills add niopub/nio-skills -s admin-skill
```

## Skills

### client-skill (installed by default)

Build client-side integrations that connect players to AI NPCs using `DISTR_KEY`:
- Create player sessions
- Send state events (HTTP and WebSocket)
- Ask NPCs questions and receive responses

### admin-skill (install on request)

Manage simulations, NPCs, and player sessions using `API_KEY`:
- Create and manage simulations (game worlds)
- Create and configure NPCs (AI characters)
- List, inspect, and delete player sessions

## Examples

See [`examples/`](examples/) for TypeScript sample code covering the full API flow:

```bash
cd examples
npm install
npx tsx simulation.ts list
```

## API Keys

Get your `API_KEY` and `DISTR_KEY` by logging in at [niopub.com/simulations](https://niopub.com/simulations/).

## License

MIT
