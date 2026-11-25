import { LINKS } from "@/lib/network";

const CRITERIA = [
  {
    title: "Design and usability",
    body: "One page, DarkSwap’s dark palette, the swap drawn before a wallet opens. Live pool numbers sit in the hero so the chain is visible without a click.",
  },
  {
    title: "Scalability",
    body: "New L1 targets 200 ms blocks and inserts notes in batches so a shielded spend does not carry the full Merkle write. The demo AMM is only a counterparty.",
  },
  {
    title: "Innovation",
    body: "atomicCall is the private swap: unshield, call a public pool, reshield. The agent takes a natural-language intent, in the line of NEAR Intents.",
  },
  {
    title: "Open source and integration",
    body: "This repository is the new code. It integrates the genesis pool at 0x…5000 and the BNBAgent SDK, and it says where the proof CLI is missing.",
  },
  {
    title: "Roadmap and model",
    body: "Planning targets are quoted from the FAQ. A later fee would sit on the public edge of a route, the way DarkSwap already discloses a quote before anyone sends.",
  },
] as const;

export function Bangkok() {
  return (
    <section className="section" id="bangkok">
      <div className="stamp">Built at BNB Bangkok</div>
      <h2>Submitted on HackQuest.</h2>
      <p className="section-lead">
        Deadline Friday 27 November 2026, 09:00 Asia/Bangkok. The build is testnet and
        devnet only. Production DarkSwap at darkswap.app is a separate app; this repo does
        not replace it.
      </p>
      <div className="criteria">
        {CRITERIA.map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
      <p className="fine">
        <a href={LINKS.hackquest}>BNB Bangkok on HackQuest</a>
        {" · "}
        <a href={LINKS.darkswap}>darkswap.app</a>
        {" · "}
        <a href={LINKS.darkswapX}>@darkswapapp</a>
        {" · "}
        <a href={LINKS.forum}>Privacy forum post</a>
      </p>
    </section>
  );
}
