/**
 * Player CRUD: create, list, get, delete.
 * Players are sessions within a simulation. Create uses DISTR_KEY; list/get/delete use API_KEY.
 */
import { env } from "./env.js";
import { parseBody } from "./util.js";

type PlayerResponse = {
  player_id?: string;
  sim_id?: string;
  created_on?: number;
  connected_from?: string;
  expires_on?: number;
};

function usage(): string {
  return [
    "Usage:",
    "  npx tsx player.ts create <sim_id> [expire_min]",
    "  npx tsx player.ts list <sim_id>",
    "  npx tsx player.ts get <player_id> <sim_id>",
    "  npx tsx player.ts delete <player_id> <sim_id>",
  ].join("\n");
}

function printPlayer(player: PlayerResponse): void {
  console.log({
    player_id: player.player_id,
    sim_id: player.sim_id,
    created_on: player.created_on,
    connected_from: player.connected_from,
    expires_on: player.expires_on,
  });
}

async function main(): Promise<void> {
  const op = process.argv[2]?.trim();
  if (!op || op === "--help" || op === "-h") {
    console.log(usage());
    return;
  }

  const baseUrl = env("BASE_URL").replace(/\/$/, "");
  const product = env("PRODUCT");
  const apiKey = env("API_KEY");
  const distrKey = env("DISTR_KEY");

  let url = "";
  let method = "GET";
  let payload: Record<string, unknown> | undefined;
  let auth = apiKey;

  if (op === "create") {
    const simId = process.argv[3]?.trim();
    if (!simId) throw new Error("create requires <sim_id>\n\n" + usage());
    const expireMinRaw = process.argv[4]?.trim();
    payload = { sim_id: simId };
    if (expireMinRaw) {
      const expireMin = Number(expireMinRaw);
      if (!Number.isInteger(expireMin) || expireMin < 1) {
        throw new Error("expire_min must be a positive integer (e.g. 2, 3)\n\n" + usage());
      }
      payload.expire_min = expireMin;
    }
    url = `${baseUrl}/user/player`;
    method = "POST";
    auth = distrKey;
  } else if (op === "list") {
    const simId = process.argv[3]?.trim();
    if (!simId) throw new Error("list requires <sim_id>\n\n" + usage());
    url = `${baseUrl}/user/players?sim_id=${encodeURIComponent(simId)}`;
  } else if (op === "get") {
    const playerId = process.argv[3]?.trim();
    const simId = process.argv[4]?.trim();
    if (!playerId || !simId) throw new Error("get requires <player_id> <sim_id>\n\n" + usage());
    url = `${baseUrl}/user/player/${playerId}?sim_id=${encodeURIComponent(simId)}`;
    auth = apiKey;
  } else if (op === "delete") {
    const playerId = process.argv[3]?.trim();
    const simId = process.argv[4]?.trim();
    if (!playerId || !simId) throw new Error("delete requires <player_id> <sim_id>\n\n" + usage());
    url = `${baseUrl}/user/player`;
    method = "DELETE";
    payload = { player_id: playerId, sim_id: simId };
  } else {
    throw new Error(`Unknown operation: ${op}\n\n${usage()}`);
  }

  const t0 = Date.now();
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${auth}`,
      product,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const elapsed = Date.now() - t0;
  const raw = await response.text();
  const body = parseBody(raw);

  if (!response.ok) {
    console.error(`player ${op} failed`);
    console.error({ status: response.status, statusText: response.statusText, body });
    process.exit(1);
  }

  console.log(`player ${op} success`);
  console.log(`API response time: ${elapsed}ms`);
  if (op === "list") {
    const players = body as PlayerResponse[];
    console.log(`Count: ${players.length}`);
    for (const player of players) {
      printPlayer(player);
    }
  } else {
    printPlayer(body as PlayerResponse);
  }
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
