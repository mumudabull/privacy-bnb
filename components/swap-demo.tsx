"use client";

import { useMemo, useState } from "react";
import { formatBnb } from "@/lib/format";
import {
  DEMO_RESERVE_BNB,
  DEMO_RESERVE_TOKEN,
  EXECUTION_CAP_WEI,
  parseBnbInput,
  quoteExactIn,
} from "@/lib/quote";

export function SwapDemo() {
  const [raw, setRaw] = useState("0.1");
  const amount = useMemo(() => parseBnbInput(raw), [raw]);
  const quoted = amount === null ? null : quoteExactIn(amount, DEMO_RESERVE_BNB, DEMO_RESERVE_TOKEN);
  const overCap = amount !== null && amount > EXECUTION_CAP_WEI;
  const empty = amount === 0n;

  return (
    <div className="swap-layout">
      <form className="panel" onSubmit={(event) => event.preventDefault()}>
        <p className="section-index">Public rehearsal</p>
        <h2>Quote a BNB to rNOTE swap.</h2>
        <p className="section-lead">
          The number is the same 0.30% constant-product quote the demo AMM uses, seeded
          with 10 BNB and 5,550 rNOTE (about 555 rNOTE per BNB). Nothing is sent from this page.
        </p>
        <label className="field" style={{ marginTop: 18 }}>
          Amount in BNB
          <input
            inputMode="decimal"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            aria-describedby="quote-help"
          />
        </label>
        <p id="quote-help" className="fine">
          {amount === null
            ? "Use a decimal BNB amount, up to 18 places."
            : empty
              ? "Enter an amount above zero."
              : `Quote: ${formatBnb(quoted ?? 0n, 6)} rNOTE.`}
        </p>
        {overCap ? (
          <p className="banner">
            Above the 0.05 BNB agent cap. A quote can still be shown. The agent will not
            execute it until a funded testnet wallet is configured.
          </p>
        ) : null}
      </form>
      <ol className="panel trace" aria-label="Rehearsal steps">
        <li>
          <strong>1 · Shield</strong>
          <span>
            {amount === null || empty
              ? "A public deposit, standing in for privDeposit."
              : `${formatBnb(amount, 6)} BNB would be locked in PublicRehearsal. On New L1, privDeposit is public too.`}
          </span>
        </li>
        <li>
          <strong>2 · atomicCall</strong>
          <span>
            The rehearsal calls DemoAMM with that BNB. A real atomicCall is a type 0x77
            proof this repo cannot build. The call target and the amount would be public
            even then.
          </span>
        </li>
        <li>
          <strong>3 · Reshield</strong>
          <span>
            {quoted === null || empty
              ? "rNOTE would be recorded as an open note inside the rehearsal."
              : `${formatBnb(quoted, 6)} rNOTE would be recorded as an open note. The real pool can reshield native BNB only, so this token note is not a shielded balance.`}
          </span>
        </li>
      </ol>
    </div>
  );
}
