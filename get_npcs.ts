/** List all NPCs in a simulation. Uses API_KEY. */
import { env } from "./env.js";

type NpcResponse = {
  npc_name?: string;
  npc_id?: string;
  sim_id?: string;
  internal_id?: string;
  description?: string;
  curr_interest_raw?: string[];
  creation_time?: number;
  update_time?: number;
};

async function main(): Promise<void> {
  const baseUrl = env("BASE_URL").replace(/\/$/, "");
  const apiKey = env("API_KEY");
  const simId = process.argv[2]?.trim();
  if (!simId) {
    throw new Error("Usage: npx tsx get_npcs.ts <sim_id>");
  }

  const t0 = Date.now();
  const response = await fetch(`${baseUrl}/npcs/${simId}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
  });

  const elapsed = Date.now() - t0;
  const raw = await response.text();
  let body: unknown = raw;
  try {
    body = raw ? JSON.parse(raw) : [];
  } catch {}

  if (!response.ok) {
    console.error("GET /npcs/{sim_id} failed");
    console.error({
      status: response.status,
      statusText: response.statusText,
      body,
    });
    process.exit(1);
  }

  const npcs = body as NpcResponse[];
  console.log("GET /npcs/{sim_id} success");
  console.log(`API response time: ${elapsed}ms`);
  console.log(`Count: ${npcs.length}`);
  for (const n of npcs) {
    console.log({
      npc_name: n.npc_name,
      npc_id: n.npc_id,
      sim_id: n.sim_id,
      creation_time: n.creation_time,
      update_time: n.update_time,
    });
  }
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
