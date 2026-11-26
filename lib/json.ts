/**
 * File: lib/json.ts
 * Purpose: JSON serialization that keeps bigint values exact. Live DemoAMM
 * reserves and wei amounts are larger than Number.MAX_SAFE_INTEGER, so they
 * are written as decimal strings. JSON.stringify throws on a bigint, which
 * turned every quote_swap call into HTTP 500 once the pool snapshot was
 * attached to the quote.
 */

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
}
