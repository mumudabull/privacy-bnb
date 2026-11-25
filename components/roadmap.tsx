import { LINKS } from "@/lib/network";

const ITEMS = [
  {
    when: "Now",
    text: "Multi-validator devnet, chain id 1105, real block production. Public testnet and mainnet have not launched. The shielded pool is native BNB only, unaudited, and may change.",
  },
  {
    when: "Q1 2027",
    text: "Public testnet. Partner-facing planning target dated 2 November 2026 in the New L1 FAQ. Subject to testing and release readiness. Not a committed date.",
  },
  {
    when: "H2 2027",
    text: "Mainnet, the same FAQ target, with the same caveat. A New L1 trusted-setup ceremony and a third-party circuit audit are still open before mainnet.",
  },
  {
    when: "After",
    text: "DarkSwap product work waits on those networks: ERC-20 shielding when the protocol has it, a relayer, and an agent identity pointed at a stable pool. This repo takes no fee and launches no token.",
  },
] as const;

export function Roadmap() {
  return (
    <section className="section" id="roadmap">
      <p className="section-index">05 — Roadmap</p>
      <h2>Devnet today. Testnet is a target.</h2>
      <p className="section-lead">
        Dates below are BNB Chain’s planning targets, cited from the docs, not a DarkSwap
        launch promise. A July 2026 blog named an earlier window. The FAQ updated on 2
        November 2026 is the source this page uses.
      </p>
      <ol className="timeline">
        {ITEMS.map((item) => (
          <li key={item.when}>
            <strong>{item.when}</strong>
            <p>{item.text}</p>
          </li>
        ))}
      </ol>
      <p className="fine">
        <a href={LINKS.faq}>General FAQ — “Is New L1 live on mainnet?”</a>
      </p>
    </section>
  );
}
