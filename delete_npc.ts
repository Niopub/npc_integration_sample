/** Delete an NPC. Uses API_KEY. */
import { env } from "./env.js";

async function main(): Promise<void> {
  const baseUrl = env("BASE_URL").replace(/\/$/, "");
  const apiKey = env("API_KEY");
  const npcId = process.argv[2]?.trim();
  if (!npcId) {
    throw new Error("Usage: npx tsx delete_npc.ts <npc_id>");
  }

  const t0 = Date.now();
  const response = await fetch(`${baseUrl}/npc`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ npc_id: npcId }),
  });

  const elapsed = Date.now() - t0;

  if (!response.ok) {
    const raw = await response.text();
    let body: unknown = raw;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {}
    console.error("DELETE /npc failed");
    console.error({
      status: response.status,
      statusText: response.statusText,
      body,
    });
    process.exit(1);
  }

  console.log("DELETE /npc success (204)");
  console.log(`API response time: ${elapsed}ms`);
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
