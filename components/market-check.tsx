/**
 * File: components/market-check.tsx
 * Purpose: Front-page section that shows the two price references the swap is
 * checked against: a CoinMarketCap BNB/USD print (server-side API call) and
 * the Atlas BNB/USD SingleFeed read on chain from BSC testnet. Each is compared
 * with the rehearsal pool's implied price.
 */

import { ATLAS_BNB_USD_FEED, readAtlasFeed } from "@/lib/atlas";
import { readMarketCheck } from "@/lib/cmc";

const ATLAS_DECISION_LABELS = {
  pass: "Inside the band",
  refuse: "Outside the band. The swap guard would revert.",
  skipped: "Not compared",
  unavailable: "Not usable",
} as const;

export async function MarketCheck() {
  // Independent reads: one failing must not hide the other.
  const [check, atlas] = await Promise.all([readMarketCheck(), readAtlasFeed()]);
  const atlasWarn = !atlas.ok || atlas.decision === "refuse" || atlas.decision === "unavailable";
  const warn = check.decision === "refuse" || check.decision === "unavailable";
  const label =
    check.decision === "pass"
      ? "Inside the band"
      : check.decision === "refuse"
        ? "Outside the band. Execution would be refused."
        : check.decision === "skipped"
          ? "Not requested"
          : "Unavailable";

  return (
    <section className="section" id="market">
      <p className="section-index">06 — Market check</p>
      <h2>CoinMarketCap and Atlas against the pool.</h2>
      <p className="section-lead">
        Each quote asks CoinMarketCap for BNB/USD and compares it with the rehearsal pool.
        One rNOTE is treated as one dollar, so rNOTE out per BNB is an implied BNB price.
        The seed pool spot is about {check.ammImpliedUsd} USD per BNB. A live print outside{" "}
        {check.maxDeviationBps} bps refuses the swap. The same pool price is also compared
        with the Atlas BNB/USD feed, read on chain from {ATLAS_BNB_USD_FEED.networkName}.
        This is a public rehearsal, not a shielded fill.
      </p>
      <div className="stats">
        <article className="stat-card">
          <span>AMM implied</span>
          <strong>{check.ammImpliedUsd}</strong>
          <em>USD per BNB, seed spot</em>
        </article>
        <article className="stat-card">
          <span>CMC BNB/USD</span>
          <strong>{check.cmcUsd ?? "—"}</strong>
          <em>{check.httpStatus === null ? "no request" : `HTTP ${check.httpStatus}`}</em>
        </article>
        <article className="stat-card">
          <span>Deviation</span>
          <strong>{check.deviationBps === null ? "—" : `${check.deviationBps} bps`}</strong>
          <em>limit {check.maxDeviationBps} bps</em>
        </article>
        <article className="stat-card">
          <span>Decision</span>
          <strong>{check.decision}</strong>
          <em>{label}</em>
        </article>
      </div>
      <p className={warn ? "banner" : "banner ok-banner"}>{check.detail}</p>
      {check.responseSha256 ? (
        <p className="fine">Response sha256 {check.responseSha256}. The key is not stored.</p>
      ) : null}

      <h3>Atlas BNB/USD, read on chain</h3>
      {atlas.ok ? (
        <div className="stats">
          <article className="stat-card">
            <span>Atlas BNB/USD</span>
            <strong>{atlas.atlasUsd}</strong>
            <em>round {atlas.roundId}</em>
          </article>
          <article className="stat-card">
            <span>Updated</span>
            <strong>{atlas.ageSeconds} s ago</strong>
            <em>stale after {atlas.maxStaleSeconds} s</em>
          </article>
          <article className="stat-card">
            <span>Deviation</span>
            <strong>{atlas.deviationBps === null ? "—" : `${atlas.deviationBps} bps`}</strong>
            <em>limit {atlas.maxDeviationBps} bps</em>
          </article>
          <article className="stat-card">
            <span>Decision</span>
            <strong>{atlas.decision}</strong>
            <em>{ATLAS_DECISION_LABELS[atlas.decision]}</em>
          </article>
        </div>
      ) : null}
      <p className={atlasWarn ? "banner" : "banner ok-banner"}>
        {atlas.ok ? atlas.detail : `The Atlas feed could not be read: ${atlas.error}`}
      </p>
      <p className="fine">
        SingleFeed BNB/USD at{" "}
        <a href={ATLAS_BNB_USD_FEED.explorerUrl}>{ATLAS_BNB_USD_FEED.address}</a>,{" "}
        {ATLAS_BNB_USD_FEED.networkName}, chain {ATLAS_BNB_USD_FEED.chainId}. Read with{" "}
        <code>decimals()</code> and <code>latestRoundData()</code>. No key and no
        transaction.
      </p>
    </section>
  );
}
