/** List all NPCs in a simulation. Uses API_KEY. */
import { env } from "./env.js";

type NpcResponse = {
  npc_id?: string;
  sim_id?: string;
  owner_id?: string;
  curr_interest_raw?: string;
  curr_interest_emb?: string;
  description?: string;
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
  const response = await fetch(`${baseUrl}/simulation/${simId}/npcs`, {
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
    console.error("GET /simulation/{sim_id}/npcs failed");
    console.error({
      status: response.status,
      statusText: response.statusText,
      body,
    });
    process.exit(1);
  }

  const npcs = body as NpcResponse[];
  console.log("GET /simulation/{sim_id}/npcs success");
  console.log(`API response time: ${elapsed}ms`);
  console.log(`Count: ${npcs.length}`);
  for (const n of npcs) {
    console.log({
      npc_id: n.npc_id,
      sim_id: n.sim_id,
      owner_id: n.owner_id,
      curr_interest_raw: n.curr_interest_raw,
      curr_interest_emb: n.curr_interest_emb,
      description: n.description,
      creation_time: n.creation_time,
      update_time: n.update_time,
    });
  }
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
