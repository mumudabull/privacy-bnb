/**
 * File: components/hack/swap-simulation.tsx
 * Purpose: Presenter-paced walk-through of what an accepted quote would do.
 * Five steps, one click each. It sends nothing, asks for no wallet, and
 * invents no transaction hash.
 */

"use client";

import { ArrowLeftRight, ListChecks, Lock, RotateCcw, ScrollText, Shield } from "lucide-react";
import { useState } from "react";
import type { AgentQuote } from "@/lib/agent-quote";
import type { HackConsoleCopy } from "@/lib/hack-copy";
import { RECORDED_REHEARSAL_TX_URL } from "@/lib/network";

const STEP_ICONS = [ListChecks, Shield, ArrowLeftRight, Lock, ScrollText] as const;

export function SwapSimulation({ quote, copy }: { quote: AgentQuote; copy: HackConsoleCopy }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const simulation = copy.simulation;
  const marketCheck = quote.market ? copy.describeMarket(quote.market) : "";
  const steps = simulation.steps;

  if (visibleCount === 0) {
    return (
      <div className="hack-simulation">
        <button type="button" className="hack-button" onClick={() => setVisibleCount(1)}>
          {simulation.start}
        </button>
      </div>
    );
  }

  const showingLastStep = visibleCount >= steps.length;

  return (
    <div className="hack-simulation">
      <p className="hack-simulation-status">{simulation.status}</p>
      <ol className="hack-simulation-steps">
        {steps.slice(0, visibleCount).map((step, index) => {
          const Icon = STEP_ICONS[index];
          const isCurrent = index === visibleCount - 1;
          const isReceipt = index === steps.length - 1;
          return (
            <li key={step.title} aria-current={isCurrent ? "step" : undefined}>
              <h3>
                {Icon ? <Icon size={16} aria-hidden /> : null}
                {step.title}
              </h3>
              <p>{step.body(quote, marketCheck)}</p>
              {isReceipt ? (
                <p>
                  <a href={RECORDED_REHEARSAL_TX_URL}>{simulation.recordedLink}</a>
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="hack-simulation-actions">
        {showingLastStep ? null : (
          <button type="button" className="hack-button" onClick={() => setVisibleCount((count) => count + 1)}>
            {simulation.next}
          </button>
        )}
        <button type="button" className="hack-button hack-button-quiet" onClick={() => setVisibleCount(0)}>
          <RotateCcw size={16} aria-hidden />
          {simulation.startOver}
        </button>
      </div>
    </div>
  );
}
