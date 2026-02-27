/** Fetch a single player by id and sim_id. Uses API_KEY. */
import { env } from "./env.js";

type PlayerResponse = {
  player_id?: string;
  owner_id?: string;
  sim_id?: string;
  created_on?: number;
  connected_from?: string;
  expires_on?: number;
};

async function main(): Promise<void> {
  const baseUrl = env("BASE_URL").replace(/\/$/, "");
  const apiKey = env("API_KEY");
  const playerId = process.argv[2]?.trim();
  const simId = process.argv[3]?.trim();
  if (!playerId || !simId) {
    throw new Error("Usage: npx tsx get_player.ts <player_id> <sim_id>");
  }

  const t0 = Date.now();
  const response = await fetch(
    `${baseUrl}/user/player/${playerId}?sim_id=${encodeURIComponent(simId)}`,
    {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
    }
  );

  const elapsed = Date.now() - t0;
  const raw = await response.text();
  let body: unknown = raw;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {}

  if (!response.ok) {
    console.error("GET /user/player/{player_id} failed");
    console.error({
      status: response.status,
      statusText: response.statusText,
      body,
    });
    process.exit(1);
  }

  const player = body as PlayerResponse;
  console.log("GET /user/player/{player_id} success");
  console.log(`API response time: ${elapsed}ms`);
  console.log({
    player_id: player.player_id,
    owner_id: player.owner_id,
    sim_id: player.sim_id,
    created_on: player.created_on,
    connected_from: player.connected_from,
    expires_on: player.expires_on,
  });
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
