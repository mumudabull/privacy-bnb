/**
 * File: components/hack/agent-console.tsx
 * Purpose: Interactive quote console for the hackathon page. Sends the typed
 * sentence to this site's public MCP endpoint (/api/mcp, tool quote_swap) and
 * shows the agent's answer in the page's language. It only quotes: no wallet,
 * no key, no transaction.
 */

"use client";

import { ArrowRight, Bot, Check, LoaderCircle, Sparkles, X } from "lucide-react";
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { SwapSimulation } from "@/components/hack/swap-simulation";
import { TestnetReadonlyNote } from "@/components/testnet-readonly-note";
import type { AgentQuote } from "@/lib/agent-quote";
import { HACK_COPY, type HackConsoleCopy, type HackLocale } from "@/lib/hack-copy";
import { MAXIMUM_INTENT_LENGTH } from "@/lib/intent";

const MCP_ENDPOINT_PATH = "/api/mcp";
const QUOTE_TOOL_NAME = "quote_swap";

type ConsoleState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "answered"; quote: AgentQuote; answerId: number }
  | { phase: "failed"; rateLimited: boolean };

type McpToolCallResponse = {
  result?: { content?: { type: string; text?: string }[] };
  error?: { message?: string };
};

/** The quote endpoint did not answer, or it answered 429. No price is invented. */
class QuoteRequestError extends Error {
  readonly rateLimited: boolean;

  constructor(rateLimited: boolean) {
    super(rateLimited ? "rate limited" : "quote request failed");
    this.rateLimited = rateLimited;
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
  if (response.status === 429) {
    throw new QuoteRequestError(true);
  }
  if (!response.ok) {
    throw new QuoteRequestError(false);
  }
  const payload = (await response.json()) as McpToolCallResponse;
  const quoteText = payload.result?.content?.find((block) => block.type === "text")?.text;
  if (payload.error || quoteText === undefined) {
    throw new QuoteRequestError(false);
  }
  return JSON.parse(quoteText) as AgentQuote;
}

export function AgentConsole({ locale }: { locale: HackLocale }) {
  // Copy is looked up here because functions cannot cross the server-to-client boundary as props.
  const copy = HACK_COPY[locale].console;
  const inputId = useId();
  const [sentence, setSentence] = useState<string>("");
  const [consoleState, setConsoleState] = useState<ConsoleState>({ phase: "idle" });
  const answerSeq = useRef(0);

  async function submitSentence(sentenceToQuote: string) {
    const trimmedSentence = sentenceToQuote.trim();
    if (trimmedSentence.length === 0) return;
    setConsoleState({ phase: "loading" });
    try {
      const quote = await requestQuote(trimmedSentence);
      answerSeq.current += 1;
      setConsoleState({ phase: "answered", quote, answerId: answerSeq.current });
    } catch (error) {
      // The endpoint did not answer, or it asked the caller to slow down.
      // Show a fixed line and do not invent a price.
      const rateLimited = error instanceof QuoteRequestError && error.rateLimited;
      setConsoleState({ phase: "failed", rateLimited });
    }
  }

  const isLoading = consoleState.phase === "loading";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    void submitSentence(sentence);
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || isLoading) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function runExample(exampleSentence: string) {
    setSentence(exampleSentence);
    return submitSentence(exampleSentence);
  }

  return (
    <div className="hack-console">
      <div className="hack-console-head">
        <span className="hack-agent-avatar" aria-hidden>
          <Bot size={22} />
        </span>
        <div className="hack-console-head-copy">
          <div className="hack-console-title-row">
            <h2 className="hack-console-title" id={`${inputId}-title`}>
              {copy.consoleTitle}
            </h2>
            <span className="hack-demo-badge">{copy.demoBadge}</span>
          </div>
          <p id={`${inputId}-explainer`}>{copy.consoleExplainer}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="hack-console-form">
        <label className="hack-visually-hidden" htmlFor={inputId}>
          {copy.inputLabel}
        </label>
        <div className="hack-console-row">
          <div className="hack-prompt">
            <Sparkles size={18} aria-hidden />
            {/* The field stays English on every page. The Chinese caption says that an English command is required. */}
            <textarea
              id={inputId}
              lang="en"
              rows={5}
              value={sentence}
              placeholder={copy.inputPlaceholder}
              aria-describedby={`${inputId}-explainer ${inputId}-caption`}
              maxLength={MAXIMUM_INTENT_LENGTH}
              onChange={(event) => setSentence(event.target.value)}
              onKeyDown={handlePromptKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="hack-prompt-meta">
            <p className="hack-prompt-caption" id={`${inputId}-caption`}>
              {copy.promptCaption}
            </p>
            <p className="hack-prompt-count">
              {sentence.length}/{MAXIMUM_INTENT_LENGTH}
            </p>
          </div>
          <button type="submit" className="hack-button hack-quote-submit" disabled={isLoading}>
            {isLoading ? (
              <LoaderCircle size={18} aria-hidden className="hack-spin" />
            ) : (
              <ArrowRight size={18} aria-hidden />
            )}
            <span>{isLoading ? copy.submitting : copy.submit}</span>
          </button>
        </div>
      </form>

      <div className="hack-try">
        <p className="hack-try-label" id={`${inputId}-try`}>
          {copy.tryLabel}
        </p>
        <ul className="hack-console-examples" aria-labelledby={`${inputId}-try`}>
          {copy.examples.map((example) => (
            <li key={example.sentence}>
              <button type="button" onClick={() => runExample(example.sentence)} disabled={isLoading}>
                {example.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <TestnetReadonlyNote text={copy.readonlyNote} />

      {/* Announced politely so screen readers hear the answer without losing focus. */}
      <div className="hack-console-answer" aria-live="polite">
        {consoleState.phase === "idle" && <p className="hack-console-hint">{copy.idleHint}</p>}
        {consoleState.phase === "failed" && (
          <p className="hack-console-demo">
            {consoleState.rateLimited ? copy.rateLimited : copy.demoFallback}
          </p>
        )}
        {consoleState.phase === "answered" && (
          <QuoteAnswer key={consoleState.answerId} quote={consoleState.quote} copy={copy} />
        )}
      </div>
    </div>
  );
}

function atlasBlockedQuote(quote: AgentQuote): boolean {
  const atlasStatus = quote.market?.atlas.status;
  return atlasStatus === "stale" || atlasStatus === "unavailable";
}

export function QuoteAnswer({ quote, copy }: { quote: AgentQuote; copy: HackConsoleCopy }) {
  const wasAccepted = quote.status === "quoted";
  const reason = copy.describeReason(quote);
  const headline =
    quote.status === "market_refused" && atlasBlockedQuote(quote)
      ? copy.atlasRefusedHeadline
      : copy.statusHeadlines[quote.status];
  return (
    <div className="hack-answer" data-accepted={wasAccepted}>
      <p className="hack-answer-status">
        {wasAccepted ? <Check size={18} aria-hidden /> : <X size={18} aria-hidden />}
        {headline}
      </p>
      {reason && <p className="hack-answer-reason">{reason}</p>}
      {quote.quoteRnote !== undefined && quote.amountBnb !== undefined && (
        <dl>
          <div>
            <dt>{copy.fieldSell}</dt>
            <dd>{quote.amountBnb} BNB</dd>
          </div>
          <div>
            <dt>{copy.fieldPoolQuote}</dt>
            <dd>{quote.quoteRnote} rNOTE</dd>
          </div>
          <div>
            <dt>{copy.fieldExecutionCap}</dt>
            <dd>{quote.executionCapBnb} BNB</dd>
          </div>
          {quote.market && (
            <div>
              <dt>{copy.fieldMarketCheck}</dt>
              <dd>{copy.describeMarket(quote.market)}</dd>
            </div>
          )}
        </dl>
      )}
      {quote.assetNote && quote.assetOut && (
        <p className="hack-answer-reason">{copy.describeUnsupportedAsset(quote.assetOut)}</p>
      )}
      <p className="hack-answer-privacy">{copy.privacyLine}</p>
      {wasAccepted ? <SwapSimulation quote={quote} copy={copy} /> : null}
    </div>
  );
}
