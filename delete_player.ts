/** Delete a player. Uses API_KEY. */
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
    throw new Error("Usage: npx tsx delete_player.ts <player_id> <sim_id>");
  }

  const response = await fetch(`${baseUrl}/user/player`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ player_id: playerId, sim_id: simId }),
  });

  const raw = await response.text();
  let body: unknown = raw;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {}

  if (!response.ok) {
    console.error("DELETE /user/player failed");
    console.error({
      status: response.status,
      statusText: response.statusText,
      body,
    });
    process.exit(1);
  }

  const player = body as PlayerResponse;
  console.log("DELETE /user/player success");
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
