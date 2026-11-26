import type { Metadata } from "next";
import { SwapDemo } from "@/components/swap-demo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { readDevnet } from "@/lib/devnet";
import { readDemoPool } from "@/lib/pool";
import { formatBnb, formatInteger } from "@/lib/format";
import { BSC_TESTNET_CHAIN_ID, NETWORK, PUBLIC_REHEARSAL_EXPLORER } from "@/lib/network";

export const metadata: Metadata = {
  title: "Public rehearsal · DarkSwap on BNB",
  description:
    "A public shield, swap, and reshield rehearsal. Not a private transfer and not the New L1 shielded pool.",
};

export const revalidate = 15;

export default async function SwapPage() {
  const status = await readDevnet();
  const demo = await readDemoPool();
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
            ShieldedPool at {NETWORK.shieldedPool} is on devnet, and this page reads
            it. Spending a note needs two PLONK proofs from the unpublished newl1-shield
            CLI. Until that exists, this page only quotes the same three hops against a
            public contract: shield, swap on a demo AMM, record the output. Owners and amounts
            stay visible. That is a simulation of the shape, not a privacy guarantee. Nothing
            on this page is sent.
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
              <em>Devnet demo, native BNB</em>
            </article>
            <article className="stat-card">
              <span>This demo</span>
              <strong>Public</strong>
              <em>rNOTE is not inside the pool</em>
            </article>
            <article className="stat-card">
              <span>Deployed rehearsal</span>
              <strong>BSC testnet</strong>
              <em>
                <a href={PUBLIC_REHEARSAL_EXPLORER}>PublicRehearsal, chain {BSC_TESTNET_CHAIN_ID}</a>
              </em>
            </article>
          </div>
          <SwapDemo
            reserveBnb={demo.ok ? demo.reserveBnb.toString() : null}
            reserveToken={demo.ok ? demo.reserveToken.toString() : null}
          />
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
