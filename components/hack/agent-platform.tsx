/**
 * File: components/hack/agent-platform.tsx
 * Purpose: The section under the hackathon hero that says DarkSwap has an AI
 * swap agent and an MCP endpoint other agents can call. Chain chips use the
 * status in lib/hack-copy.ts. The copy button writes the public MCP URL.
 */

"use client";

import { Bot, Check, Copy, Plug, Waypoints } from "lucide-react";
import { useEffect, useState } from "react";
import type { HackAgentsCopy, HackChainState } from "@/lib/hack-copy";

function chainClass(state: HackChainState): string {
  switch (state) {
    case "live":
      return "hack-chip hack-chip-live";
    case "soon":
      return "hack-chip hack-chip-soon";
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

export function AgentPlatform({ copy }: { copy: HackAgentsCopy }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(copy.mcpUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="hack-agents" id="agents" aria-labelledby="hack-agents-title">
      <h2 id="hack-agents-title">{copy.title}</h2>
      <p className="hack-agents-intro">{copy.intro}</p>
      <div className="hack-agents-grid">
        <article>
          <h3>
            <Bot size={18} aria-hidden />
            {copy.agentTitle}
          </h3>
          <p>{copy.agentBody}</p>
        </article>
        <article>
          <h3>
            <Plug size={18} aria-hidden />
            {copy.mcpTitle}
          </h3>
          <p>{copy.mcpBody}</p>
          <div className="hack-mcp-row">
            <p className="hack-mcp-url">
              <span className="hack-method">{copy.mcpMethod}</span>
              {copy.mcpUrl}
            </p>
            <button type="button" className="hack-button" onClick={() => void copyEndpoint()}>
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              <span>{copied ? copy.mcpCopied : copy.mcpCopy}</span>
            </button>
          </div>
          <p className="hack-mcp-tool">
            {copy.mcpToolLabel} <code>{copy.mcpTool}</code>
          </p>
          <p className="hack-agents-link">
            <a href="/#agent">{copy.mcpTechnical}</a>
          </p>
        </article>
        <article>
          <h3>
            <Waypoints size={18} aria-hidden />
            {copy.chainsTitle}
          </h3>
          <p>{copy.chainsBody}</p>
          <ul className="hack-chains">
            {copy.chains.map((chain) => (
              <li key={chain.name}>
                <span>{chain.name}</span>
                <span className={chainClass(chain.state)}>{chain.status}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
