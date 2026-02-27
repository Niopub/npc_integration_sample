/** Parse JSON response; return raw string if invalid. */
export function parseBody(raw: string): unknown {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return raw;
  }
}
