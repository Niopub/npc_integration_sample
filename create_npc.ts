/**
 * Create a single NPC with random interests from corpus.
 * Use npc.ts create for preset-based creation.
 */
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

const GAME_STATE_CHANGE_INTERESTS_CORPUS: string[] = [
  "day night cycle shifts affect patrols",
  "weather changes reduce long range visibility",
  "resource scarcity spikes change crafting priorities",
  "faction reputation shifts unlock hostile dialogue",
  "territory control flips alter spawn ownership",
  "quest branch outcomes reshape village behavior",
  "economy inflation raises merchant barter thresholds",
  "market volatility changes item rarity values",
  "seasonal biome transitions unlock migration routes",
  "enemy spawn surges trigger defensive formations",
  "boss phase transitions punish greedy attacks",
  "difficulty scaling thresholds alter damage windows",
  "party morale swings reduce combat coordination",
  "ally betrayal events change trust mechanics",
  "npc trust updates unlock secret interactions",
  "stealth detection changes force route adjustments",
  "combat stance changes alter stamina costs",
  "cooldown reset windows create burst opportunities",
  "buff stack decay weakens frontline pressure",
  "crowd panic spread changes evacuation paths",
  "city alert escalation increases guard density",
  "crime heat buildup triggers bounty hunters",
  "guard patrol shifts expose blind spots",
  "lockdown protocol activation blocks market access",
  "base defense integrity loss opens breaches",
  "structure damage stages impact repair costs",
  "repair state recovery restores turret accuracy",
  "fog of war reveals hidden ambushers",
  "checkpoint control flips open travel shortcuts",
  "portal cycle changes disrupt fast travel",
  "hazard zone expansion restricts safe routes",
  "radiation spikes force shelter prioritization",
  "corruption spread alters wildlife aggression patterns",
  "infection outbreak phases strain healing supplies",
  "energy grid overload events disable stations",
  "power restoration phases reboot security drones",
  "supply line disruptions starve frontline units",
  "convoy ambush outcomes shift regional morale",
  "diplomacy treaty status changes border access",
  "war declaration events trigger full mobilization",
  "ceasefire expiration reopens contested objectives",
  "siege progression stages weaken outer walls",
  "fortification breaches create new entry vectors",
  "loot tier unlocks improve drop quality",
  "crafting station upgrades shorten production times",
  "tech tree milestones unlock utility skills",
  "world event windows boost encounter density",
  "story chapter transitions change faction goals",
  "respawn timer changes punish reckless pushes",
  "permadeath flag toggles raise mission stakes",
];

/** Shuffle and pick N interests for NPC creation. */
function pickRandomInterests(targetCount = 15): string[] {
  const shuffled = [...GAME_STATE_CHANGE_INTERESTS_CORPUS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(targetCount, GAME_STATE_CHANGE_INTERESTS_CORPUS.length));
}

async function main(): Promise<void> {
  const baseUrl = env("BASE_URL").replace(/\/$/, "");
  const product = env("PRODUCT");
  const apiKey = env("API_KEY");
  const simId = process.argv[2]?.trim();
  if (!simId) {
    throw new Error("Usage: npx tsx create_npc.ts <sim_id>");
  }
  const npcName = `NPC ${Date.now()}`;
  const description = "NPC created by integration test.";
  const randomInterestsCount = 13 + Math.floor(Math.random() * 5); // 13-17 (~15)
  const interests = pickRandomInterests(randomInterestsCount);

  const payload = {
    sim_id: simId,
    npc_name: npcName,
    description,
    interests,
  };

  const t0 = Date.now();
  const response = await fetch(`${baseUrl}/npc`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      product,
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
    console.error("POST /npc failed");
    console.error({
      status: response.status,
      statusText: response.statusText,
      body,
    });
    process.exit(1);
  }

  const npc = body as NpcResponse;
  console.log("POST /npc success");
  console.log(`API response time: ${elapsed}ms`);
  console.log({
    npc_id: npc.npc_id,
    sim_id: npc.sim_id,
    owner_id: npc.owner_id,
    curr_interest_raw: npc.curr_interest_raw,
    curr_interest_emb: npc.curr_interest_emb,
    description: npc.description,
    creation_time: npc.creation_time,
    update_time: npc.update_time,
  });
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});

