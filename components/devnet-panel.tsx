import type { DevnetSnapshot } from "@/lib/devnet";
import { formatBnb, formatInteger, queueCaughtUp, shortenHex } from "@/lib/format";
import { LINKS, NETWORK } from "@/lib/network";

export function DevnetPanel({ status }: { status: DevnetSnapshot }) {
  const chain = status.chain;
  const pool = status.pool;
  const expectedChain = chain.ok && chain.chainId === NETWORK.chainId;
  const caughtUp = pool.ok && queueCaughtUp(pool.pendingCount, pool.pendingHead);

  return (
    <section className="section" id="devnet">
      <p className="section-index">04 — Devnet</p>
      <h2>The pool is already answering.</h2>
      <p className="section-lead">
        These figures are read from {status.rpcUrl} when the page renders. Chain id{" "}
        {NETWORK.chainId} is the documented devnet. There is no New L1 faucet: devnet BNB
        is bridged from BSC testnet tBNB. The devnet is unstable and may reset.
      </p>

      {pool.ok && pool.codeBytes === 0 ? (
        <p className="banner">ShieldedPool returned empty code at {NETWORK.shieldedPool}.</p>
      ) : null}
      {chain.ok && expectedChain ? (
        <p className="banner ok-banner">Chain id {chain.chainId} matches the docs.</p>
      ) : (
        <p className="banner">
          {chain.ok
            ? `RPC returned chain id ${chain.chainId}. The docs name ${NETWORK.chainId}.`
            : `Chain read failed: ${chain.error}`}
        </p>
      )}

      <div className="stats">
        <article className="stat-card">
          <span>Latest block</span>
          <strong>{chain.ok ? formatInteger(chain.blockNumber) : "—"}</strong>
          <em>{chain.ok ? chain.clientVersion : "client unread"}</em>
        </article>
        <article className="stat-card">
          <span>Total shielded</span>
          <strong>{pool.ok ? `${formatBnb(pool.totalShieldedWei)} BNB` : "—"}</strong>
          <em>{pool.ok ? `${formatInteger(pool.codeBytes)} byte code` : "pool unread"}</em>
        </article>
        <article className="stat-card">
          <span>Merkle root</span>
          <strong>{pool.ok ? shortenHex(pool.merkleRoot, 8, 6) : "—"}</strong>
          <em>commitment tree</em>
        </article>
        <article className="stat-card">
          <span>Note queue</span>
          <strong>
            {pool.ok ? `${formatInteger(pool.pendingHead)} / ${formatInteger(pool.pendingCount)}` : "—"}
          </strong>
          <em>
            {pool.ok
              ? `${caughtUp ? "insertion caught up" : "notes waiting"} · deposits ${pool.depositPaused ? "paused" : "open"}`
              : "pending head / count"}
          </em>
        </article>
      </div>
      <p className="fine">
        Selectors verified by eth_call on this devnet: merkleRoot, totalShielded,
        pendingCount, pendingHead, depositPaused. Fees charge the declared gas limit.
        eth_getProof is unsupported. There is no public mempool.{" "}
        <a href={LINKS.networkInfo}>Network information</a>
        {" · "}
        <a href={LINKS.systemContracts}>System contracts</a>
        {" · fetched "}
        {status.fetchedAt}
      </p>
    </section>
  );
}
