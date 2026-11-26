import { readMarketCheck } from "@/lib/cmc";

export async function MarketCheck() {
  const check = await readMarketCheck();
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
      <h2>CoinMarketCap against the pool.</h2>
      <p className="section-lead">
        The agent asks CoinMarketCap for BNB/USD and compares it with the rehearsal pool.
        One rNOTE is treated as one dollar, so rNOTE out per BNB is an implied BNB price.
        The seed pool spot is about {check.ammImpliedUsd} USD per BNB. A live print outside{" "}
        {check.maxDeviationBps} bps refuses the swap. This is a public rehearsal, not a
        shielded fill.
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
    </section>
  );
}
