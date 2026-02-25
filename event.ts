/**
 * Stream events: state (game events), ask (NPC questions), stream (WebSocket).
 * POST /stream/event for state/ask; WebSocket for high-frequency stream mode.
 */
import path from "node:path";
import fs from "node:fs";
import WebSocket from "ws";
import { env } from "./env.js";

type StateEventResponse = {
  event_id?: string;
};

type AskEventResponse = {
  ask_id?: string;
  response?: string;
};

type WsMessage = Record<string, unknown>;

type StreamEventRequest = {
  player_id: string;
  sim_id: string;
  event_kind: "state" | "ask";
  event?: string;
  event_id?: string;
  npc_id?: string;
  ask_text?: string;
  ask_id?: string;
};

function usage(): string {
  return [
    "Usage:",
    "  npx tsx event.ts state <player_id> <sim_id> <event_text> [event_id]",
    "  npx tsx event.ts ask <player_id> <sim_id> <ask_text> <npc_id> [ask_id]",
    "  npx tsx event.ts stream <player_id> <sim_id> [interval_ms]",
    "",
    "stream: WebSocket mode, sends random events from data/game_events.json.",
    "interval_ms defaults to 3000 (20/min). Rate limit: 60/min per player.",
    "Ctrl+C to stop and print stats.",
  ].join("\n");
}

import { parseBody } from "./util.js";

/** Load game event strings from data file for stream mode. */
function loadGameEvents(): string[] {
  const dataPath = path.resolve(__dirname, "data", "game_events.json");
  const raw = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(raw) as string[];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Convert HTTP(S) URL to WS(S) for WebSocket. */
function httpToWs(url: string): string {
  return url.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");
}

/** WebSocket stream: connect, send random events at interval, track stats. */
async function runStream(
  baseUrl: string,
  distrKey: string,
  playerId: string,
  simId: string,
  intervalMs: number
): Promise<void> {
  const events = loadGameEvents();
  const wsUrl = `${httpToWs(baseUrl)}/stream/event/ws/${simId}/${playerId}`;

  console.log(`Connecting to ${wsUrl}`);
  console.log(`Loaded ${events.length} game events`);
  console.log(`Sending every ${intervalMs}ms — Ctrl+C to stop\n`);

  const ws = new WebSocket(wsUrl, {
    headers: {
      authorization: `Bearer ${distrKey}`,
    },
  });

  let sent = 0;
  let errors = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const t0 = Date.now();

  function printStats(): void {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const rate = sent > 0 ? (sent / parseFloat(elapsed)).toFixed(1) : "0";
    console.log(
      `\nStats: sent=${sent} errors=${errors} elapsed=${elapsed}s rate=${rate}/s`
    );
  }

  function startSending(): void {
    timer = setInterval(() => {
      if (ws.readyState !== ws.OPEN) {
        stopSending();
        return;
      }
      const event = pickRandom(events);
      const payload: WsMessage = {
        event_kind: "state",
        event,
      };
      ws.send(JSON.stringify(payload));
      sent++;
    }, intervalMs);
  }

  function stopSending(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  ws.on("open", () => {
    console.log("Connected — starting event stream");
    startSending();
  });

  ws.on("message", (data: Buffer) => {
    let msg: WsMessage;
    try {
      msg = JSON.parse(data.toString()) as WsMessage;
    } catch {
      return;
    }
    if (msg.err) {
      errors++;
      if (errors <= 5) {
        console.error("Server error:", msg.err, msg.status_code ?? "");
      }
    }
  });

  ws.on("error", (err: Error) => {
    console.error("WebSocket error:", err.message);
  });

  ws.on("close", () => {
    stopSending();
    printStats();
  });

  process.on("SIGINT", () => {
    stopSending();
    printStats();
    ws.send(JSON.stringify({ cmd: "close" }));
    ws.close();
    process.exit(0);
  });

  await new Promise<void>((resolve) => {
    ws.on("close", () => resolve());
  });
}

async function sendStreamEvent(
  url: string,
  distrKey: string,
  payload: StreamEventRequest
): Promise<{ status: number; statusText: string; body: unknown; elapsed: number }> {
  const t0 = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${distrKey}`,
    },
    body: JSON.stringify(payload),
  });
  const elapsed = Date.now() - t0;
  const raw = await response.text();
  const body = parseBody(raw);
  return { status: response.status, statusText: response.statusText, body, elapsed };
}

async function main(): Promise<void> {
  const op = process.argv[2]?.trim();
  if (!op || op === "--help" || op === "-h") {
    console.log(usage());
    return;
  }

  const baseUrl = env("BASE_URL").replace(/\/$/, "");
  const distrKey = env("DISTR_KEY");

  const playerId = process.argv[3]?.trim();
  const simId = process.argv[4]?.trim();
  if (!playerId || !simId) {
    throw new Error(`Missing required ids.\n\n${usage()}`);
  }

  if (op === "stream") {
    const intervalMs = parseInt(process.argv[5]?.trim() || "3000", 10);
    if (isNaN(intervalMs) || intervalMs < 1) {
      throw new Error("interval_ms must be a positive integer");
    }
    if (intervalMs < 2000) {
      console.warn(
        `Warning: interval ${intervalMs}ms exceeds ~30 events/min. ` +
          `WS rate limit is 60/min (2 per 2s window). ` +
          `You may hit 429 errors at high rates.`
      );
    }
    await runStream(baseUrl, distrKey, playerId, simId, intervalMs);
    return;
  }

  const url = `${baseUrl}/stream/event`;
  let payload: StreamEventRequest;

  if (op === "state") {
    const eventText = process.argv[5]?.trim();
    const eventId = process.argv[6]?.trim();
    if (!eventText) {
      throw new Error(`state requires <event_text>\n\n${usage()}`);
    }
    payload = {
      player_id: playerId,
      sim_id: simId,
      event_kind: "state",
      event: eventText,
    };
    if (eventId) payload.event_id = eventId;
  } else if (op === "ask") {
    const askText = process.argv[5]?.trim();
    const npcId = process.argv[6]?.trim();
    const askId = process.argv[7]?.trim();
    if (!askText) {
      throw new Error(`ask requires <ask_text>\n\n${usage()}`);
    }
    if (!npcId) {
      throw new Error(`ask requires <npc_id>\n\n${usage()}`);
    }
    payload = {
      player_id: playerId,
      sim_id: simId,
      npc_id: npcId,
      event_kind: "ask",
      ask_text: askText,
    };
    if (askId) payload.ask_id = askId;
  } else {
    throw new Error(`Unknown operation: ${op}\n\n${usage()}`);
  }

  const result = await sendStreamEvent(url, distrKey, payload);
  if (result.status < 200 || result.status >= 300) {
    console.error(`stream event ${op} failed`);
    console.error({
      status: result.status,
      statusText: result.statusText,
      body: result.body,
    });
    process.exit(1);
  }

  console.log(`stream event ${op} success`);
  console.log(`API response time: ${result.elapsed}ms`);
  console.log(result.body as StateEventResponse | AskEventResponse);
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
