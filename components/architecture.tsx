const LAYERS = [
  {
    name: "Intent",
    detail:
      "A sentence, the way DarkSwap already takes a route. The quote parses amount, direction, and the word “privately”.",
  },
  {
    name: "Quote",
    detail:
      "A capped, read-only quote, checked against CoinMarketCap and served over MCP. Its endpoint is registered in the ERC-8004 registry on BSC testnet.",
  },
  {
    name: "Swap",
    detail:
      "A small constant-product AMM. The honest demo calls it in the clear and names that. The real shape is atomicCall on the system pool.",
  },
  {
    name: "New L1",
    detail:
      "EVM L1, BNB gas, 200 ms blocks, no public mempool, fees on declared gas limit. ShieldedPool at 0x…5000 is a genesis system contract.",
  },
] as const;

export function Architecture() {
  return (
    <section className="section" id="architecture">
      <p className="section-index">03 — Architecture</p>
      <h2>Four layers, one route.</h2>
      <p className="section-lead">
        Production DarkSwap stays where it is, on Solana and NEAR. This repository is the
        new BNB code, kept separate. It reads the live devnet pool and, beside that,
        runs a public rehearsal of the same three hops. The rehearsal is not a privacy
        guarantee.
      </p>
      <ol className="arch-list">
        {LAYERS.map((layer) => (
          <li key={layer.name}>
            <strong>{layer.name}</strong>
            <p>{layer.detail}</p>
          </li>
        ))}
      </ol>
      <p className="fine">
        Proof generation ships with the New L1 client CLI, newl1-shield. That CLI has no
        public repository, so this repo cannot honestly submit a shielded transfer on its
        own. Live reads of the pool are real. A swap that claims to be private without a
        proof is labeled simulated.
      </p>
    </section>
  );
}
