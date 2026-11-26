/**
 * File: components/bangkok.tsx
 * Purpose: Front-page section that maps the build to the hackathon's judging
 * criteria and links out to the event page. Visible copy names the event by
 * chain and month only, with a date and no clock time. The file and export keep
 * their original names so imports elsewhere hold.
 */

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
    body: "atomicCall is the private swap: unshield, call a public pool, reshield. The swap is stated as a natural-language intent, in the line of NEAR Intents.",
  },
  {
    title: "Open source and integration",
    body: "This repository is the new code. It integrates the genesis pool at 0x…5000 and the ERC-8004 registry on BSC testnet, and it says where the proof CLI is missing.",
  },
  {
    title: "Roadmap and model",
    body: "Planning targets are quoted from the FAQ. A later fee would sit on the public edge of a route, the way DarkSwap already discloses a quote before anyone sends.",
  },
] as const;

export function Bangkok() {
  return (
    <section className="section" id="judging">
      <div className="stamp">BNB Chain hackathon · November 2026</div>
      <h2>Built for the BNB Chain hackathon on HackQuest.</h2>
      <p className="section-lead">
        Submissions close on 27 November 2026. The build is testnet and devnet only.
        Production DarkSwap at darkswap.app is a separate app; this repo does not replace
        it.
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
        <a href={LINKS.hackquest}>The hackathon on HackQuest</a>
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
