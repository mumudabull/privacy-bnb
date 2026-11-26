/**
 * File: app/hack/page.tsx
 * Purpose: Standalone page for the BNB Chain hackathon build. Explains what
 * DarkSwap on BNB does today and what waits on New L1, and lets a visitor
 * try the agent's quote live. The page shifts from DarkSwap's lavender to BNB
 * gold as it is scrolled, mirroring the product's move onto BNB.
 */

import type { Metadata } from "next";
import { ArrowRight, Check, Clock } from "lucide-react";
import { AgentConsole } from "@/components/hack/agent-console";
import { LINKS } from "@/lib/network";
import "./hack.css";

export const metadata: Metadata = {
  title: "The hackathon build · DarkSwap on BNB",
  description:
    "Say a swap in a sentence. A guarded agent quotes it, refuses what breaks its limits, and is built to settle through BNB Chain’s shielded pool.",
  openGraph: {
    title: "DarkSwap on BNB: the hackathon build",
    description:
      "A guarded swap agent on BNB Smart Chain today, built for the New L1 shielded pool.",
    type: "website",
  },
};

const LINEAGE = [
  {
    name: "Solana roots",
    body: "DarkSwap started as a private swap for Solana users. That app is live at darkswap.app and is not changed by this build.",
  },
  {
    name: "NEAR routes",
    body: "Swaps travel as intents through NEAR. The same idea drives the agent here: you state the outcome, and the route is worked out for you.",
  },
  {
    name: "BNB shield",
    body: "BNB Chain’s New L1 has a shielded pool built into the protocol. It is where this swap is designed to settle once that network opens.",
  },
] as const;

const WORKS_TODAY = [
  "An agent reads a swap sentence and quotes it against a pool.",
  "A hard cap refuses anything above 0.05 BNB.",
  "A CoinMarketCap check refuses a quote that strays from the market price.",
  "An on-chain oracle guard refuses a stale or divergent price inside the swap itself.",
  "Other agents can call the quote over MCP at /api/mcp on this site.",
  "The New L1 devnet shielded pool is read live, without a key.",
] as const;

const WAITS_ON_THE_NETWORK = [
  "A private swap. Spending a shielded note needs a proof tool that BNB Chain has not published.",
  "Tokens other than native BNB inside the shielded pool.",
  "A relayer, so the sender does not pay gas from a public address.",
  "An audit of the circuits. The devnet pool is unaudited.",
] as const;

const PATH = [
  {
    when: "Now",
    title: "Quote with the agent",
    body: "Try the quote above, or point your own agent at the MCP endpoint. Everything it does is public and capped.",
  },
  {
    when: "Public testnet",
    title: "Shield BNB",
    body: "Deposit native BNB into the shielded pool from the agent. BNB Chain’s planning target for the testnet is Q1 2027.",
  },
  {
    when: "Mainnet",
    title: "Swap privately, and bring your route",
    body: "Private swaps on New L1, with a path in for DarkSwap users on Solana and NEAR. BNB Chain’s planning target is H2 2027.",
  },
] as const;

export default function HackPage() {
  return (
    <div className="hack-page">
      {/* Decorative rail that fills from lavender to gold as the page scrolls. */}
      <div className="hack-rail" aria-hidden />

      <header className="hack-header">
        <a className="hack-brand" href="/">
          DarkSwap <span>on BNB</span>
        </a>
        <nav aria-label="Hackathon page">
          <a href="/">Technical page</a>
          <a href={LINKS.repository}>Code</a>
        </nav>
      </header>

      <main id="content">
        <section className="hack-hero">
          <div className="hack-hero-copy">
            <h1>Say the swap. The agent holds the line.</h1>
            <p>
              DarkSwap on BNB is a swap agent that takes a plain sentence, quotes it, and
              refuses anything that breaks its limits. It runs on BNB Smart Chain today
              and is built to settle through the shielded pool on BNB Chain’s New L1.
            </p>
            <p className="hack-hero-note">
              Built for the BNB Chain hackathon, November 2026. What you can try here is a
              public rehearsal. No swap on this page is private yet.
            </p>
          </div>
          <AgentConsole />
        </section>

        <section className="hack-lineage" aria-labelledby="hack-lineage-title">
          <h2 id="hack-lineage-title">From purple to gold</h2>
          <ol>
            {LINEAGE.map((step) => (
              <li key={step.name}>
                <h3>{step.name}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="hack-ledger" aria-labelledby="hack-ledger-title">
          <h2 id="hack-ledger-title">What works, and what waits</h2>
          <div className="hack-ledger-columns">
            <div>
              <h3>Works today</h3>
              <ul>
                {WORKS_TODAY.map((item) => (
                  <li key={item}>
                    <Check size={18} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Waits on New L1</h3>
              <ul>
                {WAITS_ON_THE_NETWORK.map((item) => (
                  <li key={item}>
                    <Clock size={18} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="hack-path" aria-labelledby="hack-path-title">
          <h2 id="hack-path-title">The path onto BNB</h2>
          <ol>
            {PATH.map((step) => (
              <li key={step.when}>
                <p className="hack-path-when">{step.when}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="hack-path-caveat">
            The testnet and mainnet dates are BNB Chain’s planning targets from its{" "}
            <a href={LINKS.faq}>New L1 FAQ</a>, not a DarkSwap launch promise.
          </p>
        </section>

        <section className="hack-close" aria-labelledby="hack-close-title">
          <h2 id="hack-close-title">Follow the build</h2>
          <p>
            The code is open. Updates on the New L1 integration are posted as the network
            moves from devnet to testnet.
          </p>
          <div className="hack-close-actions">
            <a className="hack-button" href={LINKS.darkswapX}>
              Follow DarkSwap on X <ArrowRight size={18} aria-hidden />
            </a>
            <a className="hack-button hack-button-quiet" href={LINKS.repository}>
              Read the code
            </a>
            <a className="hack-button hack-button-quiet" href={LINKS.darkswap}>
              Use DarkSwap on Solana
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
