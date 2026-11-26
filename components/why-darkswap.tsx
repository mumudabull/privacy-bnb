const SOURCES = {
  llama: "https://defillama.com/protocols/privacy",
  zcash: "https://www.atlaszec.com/shielded.html",
  privacyCash: "https://defillama.com/protocol/privacy-cash",
  elusiv:
    "https://medium.com/elusiv-privacy/sunsetting-elusiv-transitioning-towards-the-future-of-privacy-and-confidentiality-0b078e9bcfac",
  railgun: "https://arxiv.org/abs/2606.25926",
  bridges: "https://arxiv.org/abs/2409.04937",
  near: "https://nearstats.org/",
  bnb: "https://docs.bnbchain.org/newl1/core-concepts/privacy/",
  forum: "https://forum.bnbchain.org/t/introducing-the-new-l1-native-privacy-layer/5481",
} as const;

const STEPS = [
  { num: "01", title: "Any chain", body: "Assets start wherever the user already holds them." },
  { num: "02", title: "Intent", body: "A sentence names the swap. The route is an intent, not a new pool." },
  { num: "03", title: "One shielded pool", body: "Value is meant to settle in the New L1 shielded pool, not in a side pool." },
  { num: "04", title: "Relayed swap", body: "A DarkSwap relayer submits the atomic call and the funds stay in that pool." },
] as const;

export function WhyDarkswap() {
  return (
    <section className="section" id="why">
      <p className="section-index">Why DarkSwap</p>
      <h2>One deep shielded pool instead of fifty shallow ones.</h2>
      <p className="section-lead">
        Shielded liquidity is split across dozens of small pools on Ethereum, Solana, and
        Zcash. Each anonymity set is thin, and moving between them leaks. DarkSwap is the
        plan to funnel assets from any chain, through intents, into one BNB New L1 pool,
        where the swap happens without leaving it.
      </p>
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
        This funnel is the roadmap. Pool deposits are public today, and this repo does
        not yet submit a type 0x77 proof. The guarded quote and the public rehearsal are
        what run now.
      </p>
      <div className="why-sources">
        <p>
          <strong>Live on New L1.</strong> atomicCall unshields, calls public DeFi, and
          reshields in one transaction.{" "}
          <a href={SOURCES.forum}>BNB&apos;s post</a> measured that at about 1,010,000 gas
          against a mock DEX. That call is DarkSwap&apos;s private swap step. The preview
          pool holds native BNB only, so the funnel lands assets as BNB notes for now.
          Withdrawals can never be paused by governance.
        </p>
        <p>
          <strong>Roadmap.</strong> New L1 relayers are the main submission path. They pay
          gas, hide the user&apos;s EOA, are paid with a private fee note, and cannot change
          the recipient or the amount. Dark Pools already runs a transaction relayer, and
          running one on New L1 is the first piece of DarkSwap&apos;s core planned to move
          over. ERC20 is a reserved field on BNB&apos;s roadmap.
        </p>
        <p>
          <a href={SOURCES.llama}>DefiLlama</a> tracks 55 privacy protocols with $763.5m
          TVL, about 98% of it in Tornado Cash, Railgun, and Zama.
        </p>
        <p>
          Zcash shielded supply is split across four pools (
          <a href={SOURCES.zcash}>Atlas ZEC</a>). Solana&apos;s largest pool, Privacy Cash,
          is about $1.18m (<a href={SOURCES.privacyCash}>DefiLlama</a>). Elusiv shut down
          on 29 Feb 2024 (<a href={SOURCES.elusiv}>Elusiv</a>).
        </p>
        <p>
          17.65% of Railgun withdrawals are linkable (
          <a href={SOURCES.railgun}>arXiv 2606.25926</a>). 95.81% of bridge withdrawals
          were matched from public logs (<a href={SOURCES.bridges}>arXiv 2409.04937</a>).
        </p>
        <p>
          NEAR Intents has routed $41.25B across 39 chains, including BNB (
          <a href={SOURCES.near}>NEAR Stats</a>). On New L1, atomicCall privacy comes from
          &quot;the set of other users doing the same kind of operation&quot; (
          <a href={SOURCES.bnb}>BNB Chain docs</a>).
        </p>
      </div>
    </section>
  );
}
