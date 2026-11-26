/**
 * File: lib/rate-limit.ts
 * Purpose: Best-effort per-address rate limit for the public MCP quote route.
 * Counts live in this process. A warm Vercel instance remembers them, and a
 * new instance starts empty. This repo has no shared KV or Upstash, so the
 * cap is per instance rather than global across the deployment.
 */

export const MCP_REQUESTS_PER_WINDOW = 30;
export const MCP_WINDOW_MS = 60_000;

/** JSON-RPC server error in the implementation-defined range. HTTP status is 429. */
export const RATE_LIMIT_JSON_RPC_CODE = -32029;

type RateLimitAllowed = { allowed: true; remaining: number };
type RateLimitBlocked = { allowed: false; retryAfterSeconds: number };
export type RateLimitDecision = RateLimitAllowed | RateLimitBlocked;

const hitsByAddress = new Map<string, number[]>();

/** Drop addresses whose last minute has gone quiet, so the map cannot grow without bound. */
const MAX_TRACKED_ADDRESSES = 5000;

function firstAddress(header: string | null): string | null {
  if (header === null) return null;
  const first = header.split(",")[0]?.trim() ?? "";
  return first.length > 0 ? first : null;
}

/**
 * Address Vercel reports for the caller. x-vercel-forwarded-for is the
 * unspoofable client address on Vercel. x-real-ip is the next choice.
 * x-forwarded-for is only used when neither is present (local servers).
 * Requests with none of those headers share one bucket.
 */
export function clientAddress(headers: Headers): string {
  const vercelAddress = firstAddress(headers.get("x-vercel-forwarded-for"));
  if (vercelAddress !== null) return vercelAddress;
  const realIp = headers.get("x-real-ip")?.trim() ?? "";
  if (realIp.length > 0) return realIp;
  const forwarded = firstAddress(headers.get("x-forwarded-for"));
  if (forwarded !== null) return forwarded;
  return "unknown";
}

function sweepExpired(now: number): void {
  const windowStart = now - MCP_WINDOW_MS;
  for (const [address, hits] of hitsByAddress) {
    if (hits.every((hit) => hit <= windowStart)) hitsByAddress.delete(address);
  }
}

/**
 * Records one request in a sliding window of MCP_WINDOW_MS. A blocked call
 * does not add a hit. `now` is injectable so tests can move the window.
 */
export function consumeRateLimit(address: string, now = Date.now()): RateLimitDecision {
  if (hitsByAddress.size > MAX_TRACKED_ADDRESSES) sweepExpired(now);
  const windowStart = now - MCP_WINDOW_MS;
  const recent = (hitsByAddress.get(address) ?? []).filter((hit) => hit > windowStart);
  if (recent.length >= MCP_REQUESTS_PER_WINDOW) {
    hitsByAddress.set(address, recent);
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + MCP_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  recent.push(now);
  hitsByAddress.set(address, recent);
  return { allowed: true, remaining: MCP_REQUESTS_PER_WINDOW - recent.length };
}

/** Clears in-memory buckets. Tests use this so files do not share a full window. */
export function resetRateLimits(): void {
  hitsByAddress.clear();
}

export function readJsonRpcId(message: unknown): string | number | null {
  if (typeof message !== "object" || message === null || Array.isArray(message)) return null;
  if (!("id" in message)) return null;
  const id = message.id;
  if (typeof id === "string" || typeof id === "number" || id === null) return id;
  return null;
}

export function rateLimitedJsonRpc(id: string | number | null, retryAfterSeconds: number) {
  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code: RATE_LIMIT_JSON_RPC_CODE,
      message: `Too many requests from this address. Retry after ${retryAfterSeconds} seconds.`,
    },
  };
}
