const SOURCES = {
  railgun: "https://arxiv.org/abs/2606.25926",
  bridges: "https://arxiv.org/abs/2409.04937",
  privacyCash: "https://defillama.com/protocol/privacy-cash",
  zcash: "https://www.atlaszec.com/shielded.html",
  forum: "https://forum.bnbchain.org/t/introducing-the-new-l1-native-privacy-layer/5481",
} as const;

const CARDS = [
  {
    figure: "17.65%",
    body: "of Railgun withdrawals are linkable.",
    href: SOURCES.railgun,
    label: "arXiv 2606.25926",
  },
  {
    figure: "95.81%",
    body: "of bridge withdrawals matched from public logs.",
    href: SOURCES.bridges,
    label: "arXiv 2409.04937",
  },
] as const;

const STEPS = [
  { num: "01", title: "Any chain", body: "Assets start where they are." },
  { num: "02", title: "Intent", body: "A sentence, not a new pool." },
  { num: "03", title: "One pool", body: "BNB notes on New L1." },
  { num: "04", title: "Agent", body: "The relayer for the swap." },
] as const;

export function WhyDarkswap() {
  return (
    <section className="section" id="why">
      <p className="section-index">Why DarkSwap</p>
      <h2>One deep shielded pool instead of fifty shallow ones.</h2>
      <div className="stats why-stats">
        {CARDS.map((card) => (
          <article className="stat-card" key={card.figure}>
            <strong>{card.figure}</strong>
            <em>
              {card.body} <a href={card.href}>{card.label}</a>
            </em>
          </article>
        ))}
        <article className="stat-card">
          <strong>$1.18m</strong>
          <em>
            Solana&apos;s largest shielded pool. Zcash splits its shielded supply across four pools.{" "}
            <a href={SOURCES.privacyCash}>DefiLlama</a>
            {", "}
            <a href={SOURCES.zcash}>Atlas ZEC</a>
          </em>
        </article>
      </div>
      <p className="section-lead">
        Small, split pools mean thin anonymity sets, and every hop between them leaks.
      </p>
      <div className="why-lines">
        <p>
          <strong>Live.</strong> The private swap step is one atomicCall on New L1, about 1.01m gas
          against a mock DEX (<a href={SOURCES.forum}>BNB forum</a>). The preview pool is native BNB,
          so the funnel lands assets as BNB notes.
        </p>
        <p>
          <strong>Roadmap.</strong> DarkSwap&apos;s ERC-8004 agent (id 2930) becomes the relayer for
          user intents into one New L1 pool.
        </p>
        <p>
          <strong>Roadmap, for LPs.</strong> Move liquidity into DarkSwap dark pools on BNB for
          higher yield and arbitrage flow from private order routing. Not live.
        </p>
      </div>
      <ol className="flow-grid why-funnel">
        {STEPS.map((step) => (
          <li className="step" key={step.num}>
            <div className="num">{step.num}</div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="fine">
        Roadmap funnel. No type 0x77 proof in this repo yet. Deposits are public today.
      </p>
    </section>
  );
}
