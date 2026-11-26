/**
 * File: lib/json.ts
 * Purpose: JSON serialization that keeps bigint values exact. Values wider
 * than Number.MAX_SAFE_INTEGER are written as decimal strings. JSON.stringify
 * throws on a bigint. Quote answers copy only MarketSummary fields so the
 * pool snapshot's bigint reserves never reach this helper; it remains the
 * safety net for any bigint that still does.
 */

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
}
