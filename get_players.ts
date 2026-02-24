/** List all players in a simulation. Uses API_KEY. */
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
  const product = env("PRODUCT");
  const apiKey = env("API_KEY");
  const simId = process.argv[2]?.trim();
  if (!simId) {
    throw new Error("Usage: npx tsx get_players.ts <sim_id>");
  }

  const t0 = Date.now();
  const response = await fetch(`${baseUrl}/user/players?sim_id=${encodeURIComponent(simId)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
      product,
    },
  });

  const elapsed = Date.now() - t0;
  const raw = await response.text();
  let body: unknown = raw;
  try {
    body = raw ? JSON.parse(raw) : [];
  } catch {}

  if (!response.ok) {
    console.error("GET /user/players failed");
    console.error({
      status: response.status,
      statusText: response.statusText,
      body,
    });
    process.exit(1);
  }

  const players = body as PlayerResponse[];
  console.log("GET /user/players success");
  console.log(`API response time: ${elapsed}ms`);
  console.log(`Count: ${players.length}`);
  for (const p of players) {
    console.log({
      player_id: p.player_id,
      owner_id: p.owner_id,
      sim_id: p.sim_id,
      created_on: p.created_on,
      connected_from: p.connected_from,
      expires_on: p.expires_on,
    });
  }
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
