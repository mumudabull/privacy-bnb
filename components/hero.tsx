import type { DevnetSnapshot } from "@/lib/devnet";
import { formatBnb, formatInteger } from "@/lib/format";
import { LINKS, NETWORK } from "@/lib/network";

export function Hero({ status }: { status: DevnetSnapshot }) {
  const { chain, pool } = status;
  const poolLine = pool.ok && pool.codeBytes > 0 ? `${formatBnb(pool.totalShieldedWei)} BNB` : "unread";
  const blockLine = chain.ok ? formatInteger(chain.blockNumber) : "unread";
  const chainLine = chain.ok ? String(chain.chainId) : "unread";
  const live = chain.ok && pool.ok;

  return (
    <section className="hero" id="top">
      <div>
        <p className="kicker">BNB Bangkok · New L1 devnet</p>
        <h1>
          Private swaps,
          <br />
          settled on New L1.
        </h1>
        <p className="lede">
          DarkSwap routes private swaps that start on Solana, through NEAR Intents. This
          build brings that path to BNB Chain: shield native BNB into the New L1 pool,
          swap inside one atomic call, and reshield the result. An agent can take the
          intent as a sentence.
        </p>
        <div className="actions">
          <a className="btn primary" href="#flow">
            How the swap moves
          </a>
          <a className="btn ghost" href={LINKS.darkswapDocs}>
            DarkSwap docs
          </a>
        </div>
        <ul className="pills">
          <li>Opt-in shielded pool</li>
          <li>Native BNB only</li>
          <li>Unaudited devnet</li>
          <li>No real funds</li>
        </ul>
      </div>
      <aside className="receipt" aria-label="Live devnet receipt">
        <header>
          <strong>Shielded pool, live</strong>
          <span className="live-dot">
            <i />
            {live ? "Reading devnet" : "Devnet unread"}
          </span>
        </header>
        <dl>
          <div>
            <dt>Chain id</dt>
            <dd>{chainLine}</dd>
          </div>
          <div>
            <dt>Latest block</dt>
            <dd>{blockLine}</dd>
          </div>
          <div>
            <dt>Total shielded</dt>
            <dd>{poolLine}</dd>
          </div>
          <div>
            <dt>Pool</dt>
            <dd>0x…5000</dd>
          </div>
        </dl>
        <footer>
          System contract {NETWORK.shieldedPool}. Devnet BNB, bridged from BSC testnet.
          The pool is unaudited.
        </footer>
      </aside>
    </section>
  );
}
