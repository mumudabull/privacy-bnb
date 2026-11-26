/**
 * File: lib/rate-limit.test.ts
 * Purpose: Checks the per-address MCP window, the unspoofable address
 * header, and the JSON-RPC body returned when the window is full.
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  MAX_TRACKED_ADDRESSES,
  MCP_FIREWALL_RATE_LIMIT_ID,
  MCP_REQUESTS_PER_WINDOW,
  MCP_WINDOW_MS,
  RATE_LIMIT_JSON_RPC_CODE,
  clientAddress,
  consumeRateLimit,
  enforceRateLimit,
  rateLimitedJsonRpc,
  readJsonRpcId,
  resetRateLimits,
  type PlatformRateLimit,
} from "./rate-limit.ts";

const START = 1_700_000_000_000;

afterEach(() => {
  resetRateLimits();
});

describe("consumeRateLimit", () => {
  it("allows thirty requests in the window and blocks the next", () => {
    for (let index = 0; index < MCP_REQUESTS_PER_WINDOW; index += 1) {
      const decision = consumeRateLimit("203.0.113.8", START);
      assert.equal(decision.allowed, true);
      if (decision.allowed) assert.equal(decision.remaining, MCP_REQUESTS_PER_WINDOW - index - 1);
    }
    const blocked = consumeRateLimit("203.0.113.8", START);
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) assert.equal(blocked.retryAfterSeconds, MCP_WINDOW_MS / 1000);
  });

  it("keeps a separate window per address", () => {
    for (let index = 0; index < MCP_REQUESTS_PER_WINDOW; index += 1) {
      consumeRateLimit("203.0.113.8", START);
    }
    assert.equal(consumeRateLimit("203.0.113.8", START).allowed, false);
    assert.equal(consumeRateLimit("203.0.113.9", START).allowed, true);
  });

  it("opens the window again once the oldest hit expires", () => {
    consumeRateLimit("203.0.113.8", START);
    for (let index = 1; index < MCP_REQUESTS_PER_WINDOW; index += 1) {
      consumeRateLimit("203.0.113.8", START + 1_000);
    }
    const blocked = consumeRateLimit("203.0.113.8", START + 1_000);
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) assert.equal(blocked.retryAfterSeconds, 59);
    const reopened = consumeRateLimit("203.0.113.8", START + MCP_WINDOW_MS);
    assert.equal(reopened.allowed, true);
  });

  it("refuses a new address instead of growing past the table", () => {
    for (let index = 0; index < MAX_TRACKED_ADDRESSES; index += 1) {
      assert.equal(consumeRateLimit(`addr-${index}`, START).allowed, true);
    }
    const overflow = consumeRateLimit("addr-overflow", START);
    assert.equal(overflow.allowed, false);
    if (!overflow.allowed) assert.equal(overflow.retryAfterSeconds, MCP_WINDOW_MS / 1000);
    // A stored overflow would count as its first hit and then be allowed.
    assert.equal(consumeRateLimit("addr-overflow", START).allowed, false);
    assert.equal(consumeRateLimit("addr-0", START).allowed, true);
    assert.equal(consumeRateLimit("addr-overflow", START + MCP_WINDOW_MS).allowed, true);
  });

  it("does not count a blocked request toward the next window", () => {
    for (let index = 0; index < MCP_REQUESTS_PER_WINDOW; index += 1) {
      consumeRateLimit("203.0.113.8", START);
    }
    assert.equal(consumeRateLimit("203.0.113.8", START).allowed, false);
    const after = consumeRateLimit("203.0.113.8", START + MCP_WINDOW_MS);
    assert.equal(after.allowed, true);
    if (after.allowed) assert.equal(after.remaining, MCP_REQUESTS_PER_WINDOW - 1);
  });
});

describe("enforceRateLimit", () => {
  const request = new Request("https://hack.darkswap.app/api/mcp", {
    headers: { "x-real-ip": "203.0.113.40" },
  });

  function platform(answer: PlatformRateLimit) {
    return async () => answer;
  }

  it("uses the shared firewall decision and does not also apply the process window", async () => {
    for (let index = 0; index < MCP_REQUESTS_PER_WINDOW; index += 1) {
      consumeRateLimit("203.0.113.40", START);
    }
    assert.equal(consumeRateLimit("203.0.113.40", START).allowed, false);
    const allowed = await enforceRateLimit(request, START, platform("allowed"));
    assert.equal(allowed.allowed, true);
    const limited = await enforceRateLimit(request, START, platform("limited"));
    assert.equal(limited.allowed, false);
    if (!limited.allowed) assert.equal(limited.retryAfterSeconds, 60);
  });

  it("falls back to this process when the firewall rule is not available", async () => {
    for (let index = 0; index < MCP_REQUESTS_PER_WINDOW; index += 1) {
      assert.equal((await enforceRateLimit(request, START, platform("unavailable"))).allowed, true);
    }
    const blocked = await enforceRateLimit(request, START, platform("unavailable"));
    assert.equal(blocked.allowed, false);
  });

  it("keeps the firewall id stable for the dashboard rule", () => {
    assert.equal(MCP_FIREWALL_RATE_LIMIT_ID, "mcp-quote");
  });
});

describe("clientAddress", () => {
  it("prefers x-real-ip, the same address the Firewall SDK counts", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.8",
      "x-forwarded-for": "198.51.100.4, 203.0.113.8",
      "x-real-ip": "198.51.100.9",
    });
    assert.equal(clientAddress(headers), "198.51.100.9");
  });

  it("uses x-real-ip, then the first x-forwarded-for hop, then a shared bucket", () => {
    assert.equal(clientAddress(new Headers({ "x-real-ip": "203.0.113.10" })), "203.0.113.10");
    assert.equal(
      clientAddress(new Headers({ "x-vercel-forwarded-for": "203.0.113.12, 10.0.0.2" })),
      "203.0.113.12",
    );
    assert.equal(
      clientAddress(new Headers({ "x-forwarded-for": "203.0.113.11, 10.0.0.1" })),
      "203.0.113.11",
    );
    assert.equal(clientAddress(new Headers()), "unknown");
  });
});

describe("rate limited JSON-RPC", () => {
  it("echoes a string, number, or null id and ignores a missing body", () => {
    assert.equal(readJsonRpcId({ jsonrpc: "2.0", id: "quote-9", method: "ping" }), "quote-9");
    assert.equal(readJsonRpcId({ jsonrpc: "2.0", id: 4, method: "ping" }), 4);
    assert.equal(readJsonRpcId({ jsonrpc: "2.0", id: null, method: "ping" }), null);
    assert.equal(readJsonRpcId({ jsonrpc: "2.0", method: "ping" }), null);
    assert.equal(readJsonRpcId(undefined), null);
    assert.equal(readJsonRpcId([]), null);
  });

  it("describes the block without a quote status", () => {
    const body = rateLimitedJsonRpc("quote-9", 42);
    assert.equal(body.jsonrpc, "2.0");
    assert.equal(body.id, "quote-9");
    assert.equal(body.error.code, RATE_LIMIT_JSON_RPC_CODE);
    assert.equal(body.error.message, "Too many requests from this address. Retry after 42 seconds.");
    assert.equal("result" in body, false);
    const serialized = JSON.stringify(body);
    assert.doesNotMatch(serialized, /quoted|refused|rejected|market_refused/);
  });
});
