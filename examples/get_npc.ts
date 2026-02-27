/** Fetch a single NPC by id. Uses API_KEY. */
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
  const npcId = process.argv[2]?.trim();
  if (!npcId) {
    throw new Error("Usage: npx tsx get_npc.ts <npc_id>");
  }

  const t0 = Date.now();
  const response = await fetch(`${baseUrl}/npc/${npcId}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
  });

  const elapsed = Date.now() - t0;
  const raw = await response.text();
  let body: unknown = raw;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {}

  if (!response.ok) {
    console.error("GET /npc/{npc_id} failed");
    console.error({
      status: response.status,
      statusText: response.statusText,
      body,
    });
    process.exit(1);
  }

  const npc = body as NpcResponse;
  console.log("GET /npc/{npc_id} success");
  console.log(`API response time: ${elapsed}ms`);
  console.log({
    npc_name: npc.npc_name,
    npc_id: npc.npc_id,
    sim_id: npc.sim_id,
    description: npc.description,
    curr_interest_raw: npc.curr_interest_raw,
    creation_time: npc.creation_time,
    update_time: npc.update_time,
  });
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
