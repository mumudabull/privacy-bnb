/**
 * File: components/hack/swap-simulation.tsx
 * Purpose: Presenter-paced walk-through of an accepted quote. Five steps, one
 * click at a time, with Back and Next. It sends nothing, asks for no wallet,
 * opens no network request, and invents no transaction hash.
 */

"use client";

import { ArrowLeftRight, ListChecks, Lock, ScrollText, Shield } from "lucide-react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AgentQuote } from "@/lib/agent-quote";
import type { HackConsoleCopy } from "@/lib/hack-copy";
import { RECORDED_REHEARSAL_TX_URL } from "@/lib/network";

const STEP_ICONS = [ListChecks, Shield, ArrowLeftRight, Lock, ScrollText] as const;

export function SwapSimulation({ quote, copy }: { quote: AgentQuote; copy: HackConsoleCopy }) {
  const [stepIndex, setStepIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef(false);
  const simulation = copy.simulation;
  const steps = simulation.steps;

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    headingRef.current?.focus();
  }, [stepIndex]);

  if (quote.status !== "quoted") return null;

  const step = steps[stepIndex];
  if (!step) return null;
  const Icon = STEP_ICONS[stepIndex];
  const marketCheck = quote.market ? copy.describeMarket(quote.market) : "";
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  function goTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= steps.length || nextIndex === stepIndex) return;
    pendingFocus.current = true;
    setStepIndex(nextIndex);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(stepIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(stepIndex - 1);
    }
  }

  return (
    <section className="hack-simulation" aria-label={simulation.label} onKeyDown={onKeyDown}>
      <p className="hack-simulation-status" role="status" aria-live="polite" aria-atomic="true">
        {simulation.status(stepIndex + 1, steps.length, step.title)}
      </p>
      <div className="hack-simulation-step">
        <h3 ref={headingRef} tabIndex={-1}>
          {Icon ? <Icon size={16} aria-hidden /> : null}
          {step.title}
        </h3>
        <p>{step.body(quote, marketCheck)}</p>
        {isLast ? (
          <p>
            <a href={RECORDED_REHEARSAL_TX_URL}>{simulation.recordedLink}</a>
          </p>
        ) : null}
      </div>
      <div className="hack-simulation-actions">
        <button
          type="button"
          className="hack-button hack-button-quiet"
          onClick={() => goTo(stepIndex - 1)}
          disabled={isFirst}
        >
          {simulation.back}
        </button>
        <button type="button" className="hack-button" onClick={() => goTo(stepIndex + 1)} disabled={isLast}>
          {simulation.next}
        </button>
      </div>
    </section>
  );
}
