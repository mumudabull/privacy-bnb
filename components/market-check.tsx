import { GuardSimulation } from "@/components/guard-simulation";
import { ATLAS_EXPLORER, readQuoteMarket } from "@/lib/quote-market";
import { CMC_KEY_MISSING } from "@/lib/cmc";

export async function MarketCheck() {
  const check = await readQuoteMarket();
  const warn = check.decision === "refuse" || check.decision === "unavailable";
  const label =
    check.decision === "pass"
      ? "Inside the band"
      : check.decision === "refuse"
        ? "Outside the band. The quote is refused."
        : check.cmcDecision === "skipped"
          ? CMC_KEY_MISSING
          : "Unread";

  return (
    <section className="section" id="market">
      <p className="section-index">06 Market check</p>
      <h2>Atlas and CoinMarketCap against the pool.</h2>
      <p className="section-lead">
        One rNOTE is one dollar. The pool spot is the live DemoAMM on BSC testnet
        {check.pool.ok ? ` (${check.ammImpliedUsd} USD per BNB)` : ""}. Atlas is read on chain.
        CoinMarketCap sits beside it. The guard refuses a gap above {check.maxDeviationBps} bps
        or an Atlas update older than 3600s. This is a public rehearsal.
      </p>
      <div className="stats">
        <article className="stat-card">
          <span>Pool</span>
          <strong>{check.ammImpliedUsd}</strong>
          <em>{check.pool.ok ? "USD per BNB, live reserves" : "reserves unread"}</em>
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
          <strong>{check.cmcDecision === "skipped" ? CMC_KEY_MISSING : (check.cmcUsd ?? "unread")}</strong>
          <em>
            {check.cmcDecision === "skipped"
              ? CMC_KEY_MISSING
              : `HTTP ${check.httpStatus ?? 0} · ${check.fetchedAt ?? "unread"} · sha ${check.sha256Short ?? "unread"}`}
          </em>
        </article>
        <article className="stat-card">
          <span>CMC gap</span>
          <strong>{check.deviationBps === null ? "unread" : `${check.deviationBps} bps`}</strong>
          <em>against the pool spot</em>
        </article>
        <article className="stat-card">
          <span>Risk</span>
          <strong>{check.riskScore === null ? "unread" : String(check.riskScore)}</strong>
          <em>
            {check.riskTier} · cap {formatCap(check.capWei)} BNB
          </em>
        </article>
        <article className="stat-card">
          <span>Decision</span>
          <strong>{check.decision}</strong>
          <em>{label}</em>
        </article>
      </div>
      <p className={warn ? "banner" : "banner ok-banner"}>{check.detail}</p>
      {check.riskInputs ? (
        <p className="fine">
          Risk inputs, design bands, not a backtest. 1h {show(check.riskInputs.change1h)}, 24h{" "}
          {show(check.riskInputs.change24h)}, 7d {show(check.riskInputs.change7d)}, volume{" "}
          {show(check.riskInputs.volumeChange24h)}, fear {show(check.riskInputs.fearGreed)}, market cap{" "}
          {show(check.riskInputs.marketCapChange24h)}.
        </p>
      ) : null}
      <GuardSimulation poolUsd={check.ammImpliedUsd} atlasUsd={check.atlas.priceUsd} maxBps={check.maxDeviationBps} />
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

function formatCap(wei: string): string {
  const value = BigInt(wei);
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

function show(value: number | null): string {
  return value === null ? "unread" : String(value);
}
