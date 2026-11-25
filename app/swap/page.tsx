import type { Metadata } from "next";
import { SwapDemo } from "@/components/swap-demo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { readDevnet } from "@/lib/devnet";
import { formatBnb, formatInteger } from "@/lib/format";
import { NETWORK } from "@/lib/network";

export const metadata: Metadata = {
  title: "Public rehearsal · DarkSwap on BNB",
  description:
    "A public shield, swap, and reshield rehearsal. Not a private transfer and not the New L1 shielded pool.",
};

export const revalidate = 15;

export default async function SwapPage() {
  const status = await readDevnet();
  const pool = status.pool;
  const chain = status.chain;

  return (
    <>
      <SiteHeader />
      <main id="content" className="swap-page">
        <div className="wrap">
          <p className="kicker">Not private · devnet reads are real</p>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 68px)" }}>The swap demo is a rehearsal.</h1>
          <p className="lede">
            ShieldedPool at {NETWORK.shieldedPool} is live on devnet, and this page reads
            it. Spending a note needs two PLONK proofs from the unpublished newl1-shield
            CLI. Until that exists, DarkSwap on BNB runs the same three hops in a public
            contract: shield, swap on a demo AMM, record the output. Owners and amounts
            stay visible. That is a simulation of the shape, not a privacy guarantee.
          </p>
          <div className="stats">
            <article className="stat-card">
              <span>Chain</span>
              <strong>{chain.ok ? chain.chainId : "—"}</strong>
              <em>{chain.ok ? `block ${formatInteger(chain.blockNumber)}` : chain.error}</em>
            </article>
            <article className="stat-card">
              <span>Real pool shielded</span>
              <strong>{pool.ok ? `${formatBnb(pool.totalShieldedWei)} BNB` : "—"}</strong>
              <em>devnet native BNB, unaudited</em>
            </article>
            <article className="stat-card">
              <span>This demo</span>
              <strong>Public</strong>
              <em>rNOTE is not inside the pool</em>
            </article>
            <article className="stat-card">
              <span>Deployed rehearsal</span>
              <strong>Local</strong>
              <em>no testnet key in this environment</em>
            </article>
          </div>
          <SwapDemo />
          <p className="fine">
            Run it: <code>forge test</code> in <code>contracts/</code>, or the anvil script
            in that folder’s README. A BSC testnet or New L1 deploy needs{" "}
            <code>PRIVATE_KEY</code> and testnet BNB. No key is generated here.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
