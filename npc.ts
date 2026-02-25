/**
 * NPC CRUD: create (from preset), update, list, get, delete.
 * NPCs are characters with description and interests.
 */
import path from "node:path";
import fs from "node:fs";
import { env } from "./env.js";
import { parseBody } from "./util.js";

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

type NpcProfile = {
  name: string;
  description: string;
  interests: string[];
};

function usage(): string {
  return [
    "Usage:",
    "  npx tsx npc.ts create <sim_id> [pick a value from pre-created profiles in npc_interests.json]",
    "  npx tsx npc.ts update <npc_id> [pick a value from pre-created profiles in npc_interests.json]",
    "  npx tsx npc.ts list <sim_id>",
    "  npx tsx npc.ts get <npc_id>",
    "  npx tsx npc.ts delete <npc_id>",
  ].join("\n");
}

function dataPath(filename: string): string {
  return path.resolve(__dirname, "data", filename);
}

/** Load NPC preset profiles from data/npc_interests.json. */
function loadNpcProfiles(): NpcProfile[] {
  const raw = fs.readFileSync(dataPath("npc_interests.json"), "utf8");
  return JSON.parse(raw) as NpcProfile[];
}

function buildNpcDescription(profile: NpcProfile): string {
  return profile.description.trim();
}

function printNpcProfileOptions(profiles: NpcProfile[]): void {
  console.log("Available NPC profiles:");
  for (const p of profiles) {
    console.log(`- ${p.name}`);
  }
}

function printNpc(npc: NpcResponse): void {
  console.log({
    npc_id: npc.npc_id,
    sim_id: npc.sim_id,
    creation_time: npc.creation_time,
    update_time: npc.update_time,
  });
}

async function main(): Promise<void> {
  const op = process.argv[2]?.trim();
  if (!op || op === "--help" || op === "-h") {
    console.log(usage());
    return;
  }

  const baseUrl = env("BASE_URL").replace(/\/$/, "");
  const apiKey = env("API_KEY");
  const arg = process.argv[3]?.trim();

  let url = "";
  let method = "GET";
  let payload: Record<string, unknown> | undefined;

  if (op === "create") {
    const simId = arg;
    if (!simId) throw new Error("create requires <sim_id>\n\n" + usage());
    const profileName = process.argv.slice(4).join(" ").trim();
    const profiles = loadNpcProfiles();
    if (!profileName) {
      printNpcProfileOptions(profiles);
      console.log("\nPass one profile name as 2nd create arg.");
      return;
    }
    const profile = profiles.find((p) => p.name === profileName);
    if (!profile) {
      printNpcProfileOptions(profiles);
      throw new Error(`Unknown profile: ${profileName}`);
    }
    url = `${baseUrl}/npc`;
    method = "POST";
    payload = {
      sim_id: simId,
      npc_name: profile.name,
      description: buildNpcDescription(profile),
      interests: profile.interests,
    };
  } else if (op === "update") {
    if (!arg) throw new Error("update requires <npc_id>\n\n" + usage());
    const profileName = process.argv.slice(4).join(" ").trim();
    const profiles = loadNpcProfiles();
    if (!profileName) {
      printNpcProfileOptions(profiles);
      console.log("\nPass one profile name as 2nd update arg.");
      return;
    }
    const profile = profiles.find((p) => p.name === profileName);
    if (!profile) {
      printNpcProfileOptions(profiles);
      throw new Error(`Unknown profile: ${profileName}`);
    }
    url = `${baseUrl}/npc/${arg}`;
    method = "PUT";
    payload = {
      description: buildNpcDescription(profile),
      interests: profile.interests,
    };
  } else if (op === "list") {
    const simId = arg;
    if (!simId) throw new Error("list requires <sim_id>\n\n" + usage());
    url = `${baseUrl}/simulation/${simId}/npcs`;
  } else if (op === "get") {
    if (!arg) throw new Error("get requires <npc_id>\n\n" + usage());
    url = `${baseUrl}/npc/${arg}`;
  } else if (op === "delete") {
    if (!arg) throw new Error("delete requires <npc_id>\n\n" + usage());
    url = `${baseUrl}/npc`;
    method = "DELETE";
    payload = { npc_id: arg };
  } else {
    throw new Error(`Unknown operation: ${op}\n\n${usage()}`);
  }

  const t0 = Date.now();
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const elapsed = Date.now() - t0;
  const raw = await response.text();
  const body = await parseBody(raw);

  if (!response.ok) {
    console.error(`npc ${op} failed`);
    console.error({ status: response.status, statusText: response.statusText, body });
    process.exit(1);
  }

  console.log(`npc ${op} success`);
  console.log(`API response time: ${elapsed}ms`);
  if (op === "list") {
    const npcs = body as NpcResponse[];
    console.log(`Count: ${npcs.length}`);
    for (const npc of npcs) {
      printNpc(npc);
    }
  } else {
    printNpc(body as NpcResponse);
  }
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
