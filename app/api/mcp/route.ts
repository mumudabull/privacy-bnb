/**
 * File: app/api/mcp/route.ts
 * Purpose: Public HTTPS endpoint for the DarkSwap agent's MCP server, using the
 * Streamable HTTP transport in its stateless form: one JSON-RPC request per
 * POST, answered with one JSON body. This is the URL published in the agent's
 * ERC-8004 registration, so other agents and explorers can call quote_swap.
 */

import { readQuoteMarket } from "@/lib/quote-market";
import { handleMcpMessage, parseErrorResponse } from "@/lib/mcp-server";

// readMarketCheck uses node:crypto and node:fs, so this cannot run on the edge runtime.
export const runtime = "nodejs";
// Quotes depend on a live market print; never serve a cached response.
export const dynamic = "force-dynamic";

const MAXIMUM_REQUEST_BYTES = 8 * 1024;

const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
} as const;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });
}

/**
 * The transport requires Origin validation so a web page cannot drive the
 * server from a visitor's browser. Requests without an Origin header come
 * from non-browser MCP clients and are allowed. Browser requests must come
 * from this deployment or from an origin listed in MCP_ALLOWED_ORIGINS.
 */
function isOriginAllowed(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (originHeader === null) return true;

  let originHost: string;
  try {
    originHost = new URL(originHeader).host;
  } catch {
    return false;
  }
  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (requestHost !== null && originHost === requestHost) return true;

  const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((allowedOrigin) => allowedOrigin.trim())
    .filter((allowedOrigin) => allowedOrigin.length > 0);
  return allowedOrigins.includes(originHeader);
}

export async function POST(request: Request): Promise<Response> {
  if (!isOriginAllowed(request)) {
    return jsonResponse({ error: "Origin not allowed" }, 403);
  }

  // Read as text with a hard ceiling. Content-Length can be absent or wrong,
  // so the size is checked on the bytes actually received.
  const requestText = await request.text();
  if (new TextEncoder().encode(requestText).length > MAXIMUM_REQUEST_BYTES) {
    return jsonResponse({ error: "Request body too large" }, 413);
  }

  let message: unknown;
  try {
    message = JSON.parse(requestText);
  } catch {
    return jsonResponse(parseErrorResponse(), 400);
  }

  const mcpResponse = await handleMcpMessage(message, readQuoteMarket);
  if (mcpResponse === null) {
    // A notification was accepted. The transport specifies 202 with no body.
    return new Response(null, { status: 202 });
  }
  return jsonResponse(mcpResponse, 200);
}

/**
 * GET would open a server-to-client event stream. This server is stateless and
 * never sends unsolicited messages, so the transport's answer is 405.
 */
export function GET(): Response {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

/** No sessions are issued, so there is nothing for a client to terminate. */
export function DELETE(): Response {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
