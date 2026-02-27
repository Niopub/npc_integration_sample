/**
 * Loads .env and provides typed env var access.
 * BASE_URL defaults to https://n10s.net if unset.
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const DEFAULTS: Record<string, string> = {
  BASE_URL: "https://n10s.net",
};

/** Returns env var value, or default from DEFAULTS. Throws if missing. */
export function env(name: string, defaultValue?: string): string {
  const value = process.env[name]?.trim() ?? defaultValue ?? DEFAULTS[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}
