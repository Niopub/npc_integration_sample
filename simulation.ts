/**
 * Simulation CRUD: create, list, get, lore (apply preset), delete.
 * Simulations are game worlds or app contexts.
 */
import path from "node:path";
import fs from "node:fs";
import { env } from "./env.js";
import { parseBody } from "./util.js";

type SimulationResponse = {
  sim_id?: string;
  name?: string;
  lore?: string;
  creation_time?: number;
};

type SimulationLoreProfile = {
  name: string;
  lore: string;
};

function dataPath(filename: string): string {
  return path.resolve(__dirname, "data", filename);
}

/** Load lore presets from data/simulation_lores.json. */
function loadSimulationLores(): SimulationLoreProfile[] {
  const raw = fs.readFileSync(dataPath("simulation_lores.json"), "utf8");
  return JSON.parse(raw) as SimulationLoreProfile[];
}

function printLoreOptions(lores: SimulationLoreProfile[]): void {
  console.log("Available lore profiles:");
  for (const p of lores) {
    console.log(`- ${p.name}`);
  }
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx simulation.ts create <name>",
    "  npx tsx simulation.ts list",
    "  npx tsx simulation.ts get <sim_id>",
    "  npx tsx simulation.ts lore <sim_id> [pick a value from pre-created profiles in simulation_lores.json]",
    "  npx tsx simulation.ts delete <sim_id>",
  ].join("\n");
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
  const arg = process.argv[3]?.trim();

  let url = "";
  let method = "GET";
  let payload: Record<string, unknown> | undefined;

  if (op === "create") {
    if (!arg) throw new Error("create requires <name>\n\n" + usage());
    url = `${baseUrl}/simulation`;
    method = "POST";
    payload = { name: arg };
  } else if (op === "list") {
    url = `${baseUrl}/simulation`;
  } else if (op === "get") {
    if (!arg) throw new Error("get requires <sim_id>\n\n" + usage());
    url = `${baseUrl}/simulation/${arg}`;
  } else if (op === "lore") {
    const simId = arg;
    if (!simId) throw new Error("lore requires <sim_id>\n\n" + usage());
    const loreName = process.argv.slice(4).join(" ").trim();
    const lores = loadSimulationLores();
    if (!loreName) {
      printLoreOptions(lores);
      console.log("\nPass one lore profile name as 2nd lore arg.");
      return;
    }
    const profile = lores.find((p) => p.name === loreName);
    if (!profile) {
      printLoreOptions(lores);
      throw new Error(`Unknown lore profile: ${loreName}`);
    }
    url = `${baseUrl}/simulation/${simId}`;
    method = "PUT";
    payload = { lore: profile.lore };
  } else if (op === "delete") {
    if (!arg) throw new Error("delete requires <sim_id>\n\n" + usage());
    url = `${baseUrl}/simulation`;
    method = "DELETE";
    payload = { sim_id: arg };
  } else {
    throw new Error(`Unknown operation: ${op}\n\n${usage()}`);
  }

  const t0 = Date.now();
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      product,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const elapsed = Date.now() - t0;
  const raw = await response.text();
  const body = parseBody(raw);

  if (!response.ok) {
    console.error(`simulation ${op} failed`);
    console.error({ status: response.status, statusText: response.statusText, body });
    process.exit(1);
  }

  console.log(`simulation ${op} success`);
  console.log(`API response time: ${elapsed}ms`);
  console.log(body as SimulationResponse | SimulationResponse[]);
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});

