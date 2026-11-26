/**
 * File: lib/rate-limit.ts
 * Purpose: Per-address rate limit for the public MCP quote route. On Vercel
 * the count is the Firewall rule MCP_FIREWALL_RATE_LIMIT_ID, which is shared
 * by every instance in a region. The in-memory window is the fallback for
 * local runs and for a deployment whose firewall rule is not published yet.
 */

import { checkRateLimit } from "@vercel/firewall";

export const MCP_REQUESTS_PER_WINDOW = 30;
export const MCP_WINDOW_MS = 60_000;

/**
 * Must match the Rate limit ID of the @vercel/firewall rule on the
 * privacy-bnb project. The rule is 30 requests per 60 seconds, counted by IP.
 */
export const MCP_FIREWALL_RATE_LIMIT_ID = "mcp-quote";

/** JSON-RPC server error in the implementation-defined range. HTTP status is 429. */
export const RATE_LIMIT_JSON_RPC_CODE = -32029;

type RateLimitAllowed = { allowed: true; remaining: number };
type RateLimitBlocked = { allowed: false; retryAfterSeconds: number };
export type RateLimitDecision = RateLimitAllowed | RateLimitBlocked;

const hitsByAddress = new Map<string, number[]>();

/**
 * Hard cap on remembered addresses. A new address is refused once this many
 * buckets are still inside the window, so the map cannot grow without bound.
 */
export const MAX_TRACKED_ADDRESSES = 5000;

/** Earliest time a full table might have a free slot. Avoids scanning on every request. */
let nextCapacitySweepAt = 0;

function firstAddress(header: string | null): string | null {
  if (header === null) return null;
  const first = header.split(",")[0]?.trim() ?? "";
  return first.length > 0 ? first : null;
}

/**
 * Address Vercel reports for the caller. x-real-ip is the client address the
 * Firewall SDK counts, so the fallback uses it first. x-vercel-forwarded-for
 * is the unspoofable chain. x-forwarded-for is only used when neither is
 * present (local servers). Requests with none of those headers share one bucket.
 */
export function clientAddress(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim() ?? "";
  if (realIp.length > 0) return realIp;
  const vercelAddress = firstAddress(headers.get("x-vercel-forwarded-for"));
  if (vercelAddress !== null) return vercelAddress;
  const forwarded = firstAddress(headers.get("x-forwarded-for"));
  if (forwarded !== null) return forwarded;
  return "unknown";
}

function sweepExpired(now: number): void {
  const windowStart = now - MCP_WINDOW_MS;
  let oldestRemaining = Number.POSITIVE_INFINITY;
  for (const [address, hits] of hitsByAddress) {
    // Hits are appended in time order, so the first entry is the oldest.
    let oldest = hits[0];
    if (oldest === undefined || oldest <= windowStart) {
      const recent = hits.filter((hit) => hit > windowStart);
      if (recent.length === 0) {
        hitsByAddress.delete(address);
        continue;
      }
      hitsByAddress.set(address, recent);
      oldest = recent[0];
    }
    if (oldest !== undefined && oldest < oldestRemaining) oldestRemaining = oldest;
  }
  nextCapacitySweepAt =
    oldestRemaining === Number.POSITIVE_INFINITY ? now : oldestRemaining + MCP_WINDOW_MS;
}

function hasRoomForNewAddress(now: number): boolean {
  if (hitsByAddress.size < MAX_TRACKED_ADDRESSES) return true;
  if (now >= nextCapacitySweepAt) sweepExpired(now);
  return hitsByAddress.size < MAX_TRACKED_ADDRESSES;
}

/**
 * Records one request in a sliding window of MCP_WINDOW_MS. A blocked call
 * does not add a hit. `now` is injectable so tests can move the window.
 * A brand-new address is refused, and not stored, when the table is already
 * full of addresses that are still inside the window.
 */
export function consumeRateLimit(address: string, now = Date.now()): RateLimitDecision {
  if (!hitsByAddress.has(address) && !hasRoomForNewAddress(now)) {
    return { allowed: false, retryAfterSeconds: Math.ceil(MCP_WINDOW_MS / 1000) };
  }
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

export type PlatformRateLimit = "limited" | "allowed" | "unavailable";

/**
 * Asks the Vercel Firewall for this region's shared count. Outside production
 * the SDK does not count, so the caller uses the in-memory window. A missing
 * rule or a failed check is also unavailable, and does not invent a 429.
 */
function firewallHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  // The Fetch API hides the host header. The Firewall SDK needs it to reach
  // the shared counter, so it is copied from the request URL.
  if (!headers.host) headers.host = new URL(request.url).host;
  return headers;
}

export async function readPlatformRateLimit(request: Request): Promise<PlatformRateLimit> {
  if (process.env.NODE_ENV !== "production") return "unavailable";
  try {
    const result = await checkRateLimit(MCP_FIREWALL_RATE_LIMIT_ID, {
      headers: firewallHeaders(request),
      timeout: 1500,
    });
    if (result.rateLimited) return "limited";
    if (result.error) return "unavailable";
    return "allowed";
  } catch {
    return "unavailable";
  }
}

/**
 * Production uses the shared Firewall count when the mcp-quote rule answers.
 * Otherwise the in-memory window applies. `now` moves that window in tests.
 */
export async function enforceRateLimit(
  request: Request,
  now = Date.now(),
  readPlatform: (request: Request) => Promise<PlatformRateLimit> = readPlatformRateLimit,
): Promise<RateLimitDecision> {
  const platform = await readPlatform(request);
  switch (platform) {
    case "limited":
      return { allowed: false, retryAfterSeconds: Math.ceil(MCP_WINDOW_MS / 1000) };
    case "allowed":
      return { allowed: true, remaining: MCP_REQUESTS_PER_WINDOW };
    case "unavailable":
      return consumeRateLimit(clientAddress(request.headers), now);
    default: {
      const unreachable: never = platform;
      return unreachable;
    }
  }
}

/** Clears in-memory buckets. Tests use this so files do not share a full window. */
export function resetRateLimits(): void {
  hitsByAddress.clear();
  nextCapacitySweepAt = 0;
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
