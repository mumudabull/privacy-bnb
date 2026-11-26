/**
 * File: components/hack/agent-console.tsx
 * Purpose: Interactive quote console for the hackathon page. Sends the typed
 * sentence to this site's public MCP endpoint (/api/mcp, tool quote_swap) and
 * shows the agent's answer. It only quotes: no wallet, no key, no transaction.
 */

"use client";

import { ArrowRight, Check, LoaderCircle, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import type { AgentQuote, AgentQuoteStatus, MarketSummary } from "@/lib/agent-quote";
import { MAXIMUM_INTENT_LENGTH } from "@/lib/intent";

const MCP_ENDPOINT_PATH = "/api/mcp";
const QUOTE_TOOL_NAME = "quote_swap";

const EXAMPLE_SENTENCES = [
  { label: "A swap under the cap", sentence: "swap 0.04 bnb to rNOTE privately" },
  { label: "A swap over the cap", sentence: "swap 0.1 bnb to rNOTE privately" },
  { label: "Not a swap", sentence: "send everything to me" },
] as const;

const STATUS_HEADLINES: Record<AgentQuoteStatus, string> = {
  quoted: "Quoted",
  refused: "Refused: above the cap",
  market_refused: "Refused: outside the market band",
  rejected: "Not a swap this agent accepts",
};

type ConsoleState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "answered"; quote: AgentQuote }
  | { phase: "failed"; message: string };

type McpToolCallResponse = {
  result?: { content?: { type: string; text?: string }[] };
  error?: { message?: string };
};

function describeMarket(market: MarketSummary): string {
  switch (market.decision) {
    case "pass":
      return `Within ${market.maxDeviationBps / 100}% of CoinMarketCap BNB/USD (${market.cmcUsd}). The pool implies ${market.ammImpliedUsd}.`;
    case "refuse":
      return `Outside the ${market.maxDeviationBps / 100}% band. CoinMarketCap says ${market.cmcUsd}, the pool implies ${market.ammImpliedUsd}.`;
    case "unavailable":
      return "CoinMarketCap could not be read, so the price was not checked.";
    case "skipped":
      return "Not checked. This deployment has no CoinMarketCap key.";
  }
}

/** Calls quote_swap over MCP and returns the agent's structured answer. */
async function requestQuote(sentence: string): Promise<AgentQuote> {
  const response = await fetch(MCP_ENDPOINT_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: QUOTE_TOOL_NAME, arguments: { intent: sentence } },
    }),
  });
  if (!response.ok) {
    throw new Error(`The quote endpoint answered ${response.status}. Try again in a moment.`);
  }
  const payload = (await response.json()) as McpToolCallResponse;
  const quoteText = payload.result?.content?.find((block) => block.type === "text")?.text;
  if (payload.error || quoteText === undefined) {
    throw new Error(payload.error?.message ?? "The quote endpoint returned no answer.");
  }
  return JSON.parse(quoteText) as AgentQuote;
}

export function AgentConsole() {
  const inputId = useId();
  const [sentence, setSentence] = useState<string>(EXAMPLE_SENTENCES[0].sentence);
  const [consoleState, setConsoleState] = useState<ConsoleState>({ phase: "idle" });

  async function submitSentence(sentenceToQuote: string) {
    const trimmedSentence = sentenceToQuote.trim();
    if (trimmedSentence.length === 0) return;
    setConsoleState({ phase: "loading" });
    try {
      setConsoleState({ phase: "answered", quote: await requestQuote(trimmedSentence) });
    } catch (error) {
      setConsoleState({
        phase: "failed",
        message: error instanceof Error ? error.message : "The quote could not be fetched.",
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitSentence(sentence);
  }

  function runExample(exampleSentence: string) {
    setSentence(exampleSentence);
    void submitSentence(exampleSentence);
  }

  const isLoading = consoleState.phase === "loading";

  return (
    <div className="hack-console">
      <form onSubmit={handleSubmit} className="hack-console-form">
        <label htmlFor={inputId}>Say the swap</label>
        <div className="hack-console-row">
          <input
            id={inputId}
            type="text"
            value={sentence}
            maxLength={MAXIMUM_INTENT_LENGTH}
            onChange={(event) => setSentence(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? (
              <LoaderCircle size={18} aria-hidden className="hack-spin" />
            ) : (
              <ArrowRight size={18} aria-hidden />
            )}
            <span>{isLoading ? "Quoting" : "Get a quote"}</span>
          </button>
        </div>
      </form>

      <ul className="hack-console-examples" aria-label="Example sentences">
        {EXAMPLE_SENTENCES.map((example) => (
          <li key={example.sentence}>
            <button type="button" onClick={() => runExample(example.sentence)} disabled={isLoading}>
              {example.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Announced politely so screen readers hear the answer without losing focus. */}
      <div className="hack-console-answer" aria-live="polite">
        {consoleState.phase === "idle" && (
          <p className="hack-console-hint">
            The answer comes from this site’s public agent endpoint. Nothing is signed or sent.
          </p>
        )}
        {consoleState.phase === "failed" && (
          <p className="hack-console-error">{consoleState.message}</p>
        )}
        {consoleState.phase === "answered" && <QuoteAnswer quote={consoleState.quote} />}
      </div>
    </div>
  );
}

function QuoteAnswer({ quote }: { quote: AgentQuote }) {
  const wasAccepted = quote.status === "quoted";
  return (
    <div className="hack-answer" data-accepted={wasAccepted}>
      <p className="hack-answer-status">
        {wasAccepted ? <Check size={18} aria-hidden /> : <X size={18} aria-hidden />}
        {STATUS_HEADLINES[quote.status]}
      </p>
      {quote.reason && <p className="hack-answer-reason">{quote.reason}</p>}
      {quote.amountBnb !== undefined && (
        <dl>
          <div>
            <dt>You sell</dt>
            <dd>{quote.amountBnb} BNB</dd>
          </div>
          <div>
            <dt>Pool quote</dt>
            <dd>{quote.quoteRnote} rNOTE</dd>
          </div>
          <div>
            <dt>Execution cap</dt>
            <dd>{quote.executionCapBnb} BNB</dd>
          </div>
          {quote.market && (
            <div>
              <dt>Market check</dt>
              <dd>{describeMarket(quote.market)}</dd>
            </div>
          )}
        </dl>
      )}
      {quote.assetNote && <p className="hack-answer-reason">{quote.assetNote}</p>}
      <p className="hack-answer-privacy">{quote.privacy}</p>
    </div>
  );
}
