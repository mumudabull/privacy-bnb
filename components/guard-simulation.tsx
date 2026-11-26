"use client";

import { useMemo, useState } from "react";

/** Client-side illustration only. The slider does not read or change the chain. */
export function GuardSimulation({
  poolUsd,
  atlasUsd,
  maxBps,
}: {
  poolUsd: string;
  atlasUsd: string | null;
  maxBps: number;
}) {
  const [shift, setShift] = useState(0);
  const result = useMemo(() => {
    if (!atlasUsd) return null;
    const pool = Number(poolUsd);
    const atlas = Number(atlasUsd);
    if (!Number.isFinite(pool) || !Number.isFinite(atlas) || atlas <= 0) return null;
    const simulated = pool * (1 + shift / 10_000);
    const gap = Math.round((Math.abs(simulated - atlas) * 10_000) / atlas);
    return { simulated, gap, refuse: gap > maxBps };
  }, [atlasUsd, maxBps, poolUsd, shift]);

  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <p className="section-index">Simulation</p>
      <p className="fine">
        Simulation only. This slider is not an on-chain read. It shows when the guard would refuse
        if the pool spot moved away from the Atlas price.
      </p>
      <label className="field" style={{ marginTop: 12 }}>
        Simulated shift, {shift} bps
        <input
          type="range"
          min={0}
          max={2000}
          value={shift}
          onChange={(event) => setShift(Number(event.target.value))}
        />
      </label>
      {result ? (
        <p className={result.refuse ? "banner" : "fine"}>
          Simulated pool {result.simulated.toFixed(2)}, gap {result.gap} bps.{" "}
          {result.refuse ? `Refuse: above ${maxBps} bps.` : `Still inside ${maxBps} bps.`}
        </p>
      ) : (
        <p className="fine">Atlas price unread, so the simulation has no reference.</p>
      )}
    </div>
  );
}
