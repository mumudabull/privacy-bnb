import { ATLAS_EXPLORER, readQuoteMarket } from "@/lib/quote-market";

export async function MarketCheck() {
  const check = await readQuoteMarket();
  const warn = check.decision === "refuse" || check.decision === "unavailable";
  const label =
    check.decision === "pass"
      ? "Inside the band"
      : check.decision === "refuse"
        ? "Outside the band. The quote is refused."
        : check.decision === "skipped"
          ? "Not requested"
          : "Unread";

  return (
    <section className="section" id="market">
      <p className="section-index">06 Market check</p>
      <h2>Atlas and CoinMarketCap against the pool.</h2>
      <p className="section-lead">
        One rNOTE is treated as one dollar, so the seed pool spot is an implied BNB price of{" "}
        {check.ammImpliedUsd} USD. Atlas BNB/USD is read on chain. CoinMarketCap is compared
        only when a key is set. A gap above {check.maxDeviationBps} bps refuses the swap.
        This is a public rehearsal, not a shielded fill.
      </p>
      <div className="stats">
        <article className="stat-card">
          <span>Pool</span>
          <strong>{check.ammImpliedUsd}</strong>
          <em>USD per BNB, seed spot</em>
        </article>
        <article className="stat-card">
          <span>Atlas BNB/USD</span>
          <strong>{check.atlas.priceUsd ?? "unread"}</strong>
          <em>
            <a href={check.atlas.explorer}>{check.atlas.feed}</a>
          </em>
        </article>
        <article className="stat-card">
          <span>Gap</span>
          <strong>{check.atlas.deviationBps === null ? "unread" : `${check.atlas.deviationBps} bps`}</strong>
          <em>limit {check.maxDeviationBps} bps</em>
        </article>
        <article className="stat-card">
          <span>CMC BNB/USD</span>
          <strong>{check.cmcUsd ?? "skipped"}</strong>
          <em>{check.cmcDecision === "skipped" ? "no key on this host" : check.cmcDecision}</em>
        </article>
        <article className="stat-card">
          <span>Decision</span>
          <strong>{check.decision}</strong>
          <em>{label}</em>
        </article>
      </div>
      <p className={warn ? "banner" : "banner ok-banner"}>{check.detail}</p>
      <p className="fine">
        Confirmed by the Atlas team, read on chain.{" "}
        <a href={ATLAS_EXPLORER}>{check.atlas.feed}</a>
        {check.atlas.decimals === null ? "" : `. ${check.atlas.decimals} decimals.`}
      </p>
      {check.responseSha256 ? (
        <p className="fine">CoinMarketCap response sha256 {check.responseSha256}. The key is not stored.</p>
      ) : null}
    </section>
  );
}
