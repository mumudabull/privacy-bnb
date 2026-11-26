/**
 * File: lib/mcp-route.test.ts
 * Purpose: Drives POST /api/mcp and checks that the per-address limit answers
 * with HTTP 429, Retry-After, and a JSON-RPC error, while a request inside
 * the window still reaches the handler.
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { POST } from "../app/api/mcp/route.ts";
import { MCP_REQUESTS_PER_WINDOW, RATE_LIMIT_JSON_RPC_CODE, resetRateLimits } from "./rate-limit.ts";

afterEach(() => {
  resetRateLimits();
});

function mcpRequest(body: unknown, address = "203.0.113.20"): Request {
  return new Request("https://hack.darkswap.app/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": address,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function fillWindow(address: string): Promise<void> {
  for (let index = 0; index < MCP_REQUESTS_PER_WINDOW; index += 1) {
    const response = await POST(mcpRequest({ jsonrpc: "2.0", id: index, method: "ping" }, address));
    assert.equal(response.status, 200, `request ${index}`);
  }
}

describe("POST /api/mcp rate limit", () => {
  it("returns 429 with Retry-After once the address is over the window", async () => {
    await fillWindow("203.0.113.20");
    const response = await POST(
      mcpRequest({ jsonrpc: "2.0", id: "quote-9", method: "tools/call", params: { name: "quote_swap" } }),
    );
    assert.equal(response.status, 429);
    const retryAfter = response.headers.get("retry-after");
    assert.match(retryAfter ?? "", /^[1-9]\d*$/);
    const body = (await response.json()) as {
      jsonrpc: string;
      id: string;
      error: { code: number; message: string };
      result?: unknown;
    };
    assert.equal(body.jsonrpc, "2.0");
    assert.equal(body.id, "quote-9");
    assert.equal(body.error.code, RATE_LIMIT_JSON_RPC_CODE);
    assert.match(body.error.message, new RegExp(`Retry after ${retryAfter} seconds`));
    assert.equal(body.result, undefined);
    assert.doesNotMatch(JSON.stringify(body), /"status":"(quoted|refused|rejected|market_refused)"/);
  });

  it("does not let one address use another address's window", async () => {
    await fillWindow("203.0.113.20");
    const response = await POST(
      mcpRequest({ jsonrpc: "2.0", id: 1, method: "ping" }, "203.0.113.21"),
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as { result: unknown };
    assert.deepEqual(body.result, {});
  });

  it("still answers a ping inside the window and a bad body with the parse error", async () => {
    const allowed = await POST(mcpRequest({ jsonrpc: "2.0", id: 7, method: "ping" }));
    assert.equal(allowed.status, 200);
    const allowedBody = (await allowed.json()) as { id: number; result: unknown };
    assert.equal(allowedBody.id, 7);
    assert.deepEqual(allowedBody.result, {});

    const invalid = await POST(mcpRequest("{"));
    assert.equal(invalid.status, 400);
    const invalidBody = (await invalid.json()) as { error: { code: number } };
    assert.equal(invalidBody.error.code, -32700);
  });

  it("counts an unreadable body, then answers 429 with a null id", async () => {
    await fillWindow("203.0.113.30");
    const response = await POST(mcpRequest("not-json", "203.0.113.30"));
    assert.equal(response.status, 429);
    const body = (await response.json()) as { id: null; error: { code: number } };
    assert.equal(body.id, null);
    assert.equal(body.error.code, RATE_LIMIT_JSON_RPC_CODE);
    assert.ok(response.headers.get("retry-after"));
  });
});
