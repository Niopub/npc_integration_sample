/** Create a player session. Uses DISTR_KEY. */
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
  const distrKey = env("DISTR_KEY");
  const simId = process.argv[2]?.trim();
  if (!simId) {
    throw new Error("Usage: npx tsx create_player.ts <sim_id> [expire_min]");
  }
  const expireMinRaw = process.argv[3]?.trim();

  const payload: { sim_id: string; expire_min?: number } = { sim_id: simId };
  if (expireMinRaw) {
    const expireMin = Number(expireMinRaw);
    if (!Number.isInteger(expireMin) || expireMin < 1) {
      throw new Error("expire_min must be a positive integer (e.g. 2, 3). Usage: npx tsx create_player.ts <sim_id> [expire_min]");
    }
    payload.expire_min = expireMin;
  }

  const t0 = Date.now();
  const response = await fetch(`${baseUrl}/user/player`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${distrKey}`,
    },
    body: JSON.stringify(payload),
  });

  const elapsed = Date.now() - t0;
  const raw = await response.text();
  let body: unknown = raw;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    // Keep raw body if not JSON.
  }

  if (!response.ok) {
    console.error("POST /user/player failed");
    console.error({
      status: response.status,
      statusText: response.statusText,
      body,
    });
    process.exit(1);
  }

  const player = body as PlayerResponse;
  console.log("POST /user/player success");
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
