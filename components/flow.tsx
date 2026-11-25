import { LINKS, NETWORK } from "@/lib/network";

const STEPS = [
  {
    num: "01",
    title: "Shield",
    tag: "Public entry",
    body: "A wallet calls privDeposit on the shielded pool and locks native BNB. Sender, amount, and asset stay public. The note is queued, then written into the Merkle tree by deferBatchInsert, about every 50 blocks.",
  },
  {
    num: "02",
    title: "atomicCall",
    tag: "Swap in one tx",
    body: "A type 0x77 transaction, operation 2, or a relayer calling transact. The proof unshields a measured amount into one public call — a DEX — then reshields the return. If that call reverts, the spend stands and the escrow can be retried.",
  },
  {
    num: "03",
    title: "Reshield",
    tag: "Open note",
    body: "The return lands as an open note: the owner stays private, and the amount and asset are public. A later shielded transfer can spend it into a standard note, where amount and asset hide as well. That hop needs a proof.",
  },
] as const;

export function Flow() {
  return (
    <section className="section" id="flow">
      <p className="section-index">01 — The path</p>
      <h2>Shield, swap, reshield.</h2>
      <p className="section-lead">
        New L1 keeps a shielded pool next to ordinary EVM transactions. A private swap
        uses the atomic-call flow: leave the pool only for the DEX call, then come back
        in the same transaction. Proofs authorize a direct {NETWORK.txTypeShielded}{" "}
        submission, so the sender need not appear.
      </p>
      <div className="flow-grid">
        {STEPS.map((step) => (
          <article className="step" key={step.num}>
            <div className="num">{step.num}</div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            <div className="tag">{step.tag}</div>
          </article>
        ))}
      </div>
      <div className="disclosure">
        <h3>What stays visible</h3>
        <div className="public-grid">
          <p>
            <strong>Deposits.</strong> Sender, amount, and native BNB.
          </p>
          <p>
            <strong>Withdrawals.</strong> Recipient, amount, and asset.
          </p>
          <p>
            <strong>Atomic calls.</strong> Unshielded amount, call target, calldata, and
            the reshielded amount. The note owner can stay private.
          </p>
          <p>
            <strong>Direct fees.</strong> A {NETWORK.txTypeShielded} fee is public native
            BNB. Only a shielded-to-shielded transfer hides sender, recipient, amount,
            and asset.
          </p>
        </div>
      </div>
      <p className="fine">
        Spec:{" "}
        <a href={LINKS.privacy}>Shielded pool</a>,{" "}
        <a href={LINKS.txTypes}>transaction type 0x77</a>. The July 2026 forum post
        describes an earlier Groth16 circuit. Current docs specify two PLONK proofs, 864
        bytes each. This page follows the docs. Circuits are unaudited, and the trusted
        setup is imported.
      </p>
    </section>
  );
}
