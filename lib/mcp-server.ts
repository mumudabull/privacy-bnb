/**
 * File: lib/mcp-server.ts
 * Purpose: Transport-independent Model Context Protocol handler for the
 * DarkSwap agent's single tool, quote_swap. Takes one parsed JSON-RPC message
 * and returns the JSON-RPC response, or null for a notification. The HTTP
 * route in app/api/mcp/route.ts wraps this; the Python stdio server in
 * agent/darkswap_agent/mcp_stdio.py exposes the same tool locally.
 */

import { buildAgentQuote, type AgentQuote, type MarketSummary } from "./agent-quote.ts";
import { MAXIMUM_INTENT_LENGTH } from "./intent.ts";

export const SERVER_NAME = "darkswap-bnb";
export const SERVER_VERSION = "0.2.0";

/** Newest first. The server answers with the client's version when it is listed. */
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const QUOTE_TOOL_NAME = "quote_swap";

const JSON_RPC_PARSE_ERROR = -32700;
const JSON_RPC_INVALID_REQUEST = -32600;
const JSON_RPC_METHOD_NOT_FOUND = -32601;
const JSON_RPC_INVALID_PARAMS = -32602;

type JsonRpcId = string | number | null;

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export function parseErrorResponse(): JsonRpcResponse {
  return errorResponse(null, JSON_RPC_PARSE_ERROR, "Request body was not valid JSON");
}

export function quoteToolDefinition() {
  return {
    name: QUOTE_TOOL_NAME,
    title: "Quote a DarkSwap rehearsal swap",
    description:
      "Quote a DarkSwap rehearsal from a sentence such as 'swap 0.04 bnb to rNOTE privately'. " +
      "Public math against the seed pool, checked against the Atlas BNB/USD feed on BSC testnet " +
      "and against CoinMarketCap when a key is configured. " +
      "Refuses amounts above the 0.05 BNB execution cap. Read-only: it does not sign, broadcast, " +
      "take payment, or claim privacy.",
    inputSchema: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          maxLength: MAXIMUM_INTENT_LENGTH,
          description: "A swap sentence, for example: swap 0.04 bnb to rNOTE privately",
        },
      },
      required: ["intent"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  };
}

function negotiateProtocolVersion(requestedVersion: unknown): string {
  const isSupported =
    typeof requestedVersion === "string" &&
    (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requestedVersion);
  return isSupported ? (requestedVersion as string) : LATEST_PROTOCOL_VERSION;
}

function toolCallResult(quote: AgentQuote) {
  return {
    // Text content is the form every protocol version understands. A rejected
    // sentence is a tool-level error, so the calling model can correct itself.
    content: [{ type: "text", text: JSON.stringify(quote) }],
    isError: quote.status === "rejected",
  };
}

/**
 * Handles one JSON-RPC message. `readMarketSummary` is injected so the handler
 * stays free of network and filesystem access and can be tested directly.
 */
export async function handleMcpMessage(
  message: unknown,
  readMarketSummary: () => Promise<MarketSummary>,
): Promise<JsonRpcResponse | null> {
  if (!isRecord(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return errorResponse(null, JSON_RPC_INVALID_REQUEST, "Expected a single JSON-RPC 2.0 request");
  }

  const isNotification = !("id" in message);
  if (isNotification) {
    // Notifications (for example notifications/initialized) never get a response.
    return null;
  }
  const rawId = message.id;
  if (rawId !== null && typeof rawId !== "string" && typeof rawId !== "number") {
    return errorResponse(null, JSON_RPC_INVALID_REQUEST, "Request id must be a string or number");
  }
  const requestId: JsonRpcId = rawId;
  const params = isRecord(message.params) ? message.params : {};

  switch (message.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id: requestId,
        result: {
          protocolVersion: negotiateProtocolVersion(params.protocolVersion),
          capabilities: { tools: {} },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          instructions:
            "One read-only tool, quote_swap. Quotes describe a public rehearsal, not a shielded transfer.",
        },
      };
    case "ping":
      return { jsonrpc: "2.0", id: requestId, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id: requestId, result: { tools: [quoteToolDefinition()] } };
    case "tools/call": {
      const toolArguments = isRecord(params.arguments) ? params.arguments : {};
      const intentText = toolArguments.intent;
      if (params.name !== QUOTE_TOOL_NAME) {
        return errorResponse(requestId, JSON_RPC_INVALID_PARAMS, `Unknown tool: ${String(params.name)}`);
      }
      if (typeof intentText !== "string") {
        return errorResponse(requestId, JSON_RPC_INVALID_PARAMS, "quote_swap requires an intent string");
      }
      const marketSummary = await readMarketSummary();
      return {
        jsonrpc: "2.0",
        id: requestId,
        result: toolCallResult(buildAgentQuote(intentText, marketSummary)),
      };
    }
    default:
      return errorResponse(requestId, JSON_RPC_METHOD_NOT_FOUND, `Method not found: ${message.method}`);
  }
}
