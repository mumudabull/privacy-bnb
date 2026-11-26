/**
 * File: components/agent-section.tsx
 * Purpose: Front-page section that explains the guarded quote: a swap stated as
 * one sentence, priced against the pool, and refused past the cap or outside
 * the market band. It also records the one on-chain footprint of this build on
 * BNB Smart Chain testnet, the ERC-8004 registry entry for the quote endpoint.
 * The file and export keep their original names so imports elsewhere hold.
 */

import { LINKS } from "@/lib/network";

export function AgentSection() {
  return (
    <section className="section" id="quote">
      <div className="split">
        <div>
          <p className="section-index">02 — The quote</p>
          <h2>Say the swap. Get a guarded quote.</h2>
          <p className="section-lead">
            DarkSwap’s live routes already speak in intents. On BNB the same sentence is
            the interface: the quote reads it, prices it against the pool, and refuses
            anything over a hard cap or outside the market band. This hackathon build
            quotes and can execute the capped rehearsal. It does not take a fee. Other
            tools can call the quote over MCP at <code>/api/mcp</code> on this site. That
            endpoint is read-only and holds no key.
          </p>
          <p className="fine">
            On BNB Smart Chain testnet, the quote endpoint is registered in the ERC-8004
            registry as id 2930. Registry{" "}
            <a href="https://testnet.bscscan.com/address/0x8004A818BFB912233c491871b3d84c89A494BD9e">
              0x8004A818BFB912233c491871b3d84c89A494BD9e
            </a>
            .{" "}
            <a href="https://testnet.bscscan.com/tx/0xb1e4d02d93129995dfb26f1fed3f2c2ad9eeac997c8d0b9a2d889e1a564b6a00">
              Registration transaction
            </a>
            . Owner 0x57f37b891980616e76ED2f650e7e38BeAFd59084. Registered with the{" "}
            <a href={LINKS.agentSdk}>BNBAgent SDK</a>. The page itself sends no
            transaction.
          </p>
        </div>
        <aside className="quote-card" aria-label="Example intent">
          <div className="bubble user">
            <div className="who">You</div>
            <p>swap 0.1 bnb to the demo token, privately</p>
          </div>
          {/* The `agent` class is only the styling hook for the reply bubble. */}
          <div className="bubble agent">
            <div className="who">DarkSwap quote</div>
            <p>
              Quote on the rehearsal AMM. Cap is 0.05 BNB until a funded testnet wallet
              is configured. Execution is labeled public rehearsal unless a real 0x77
              proof is attached.
            </p>
          </div>
          <p className="note">
            Example copy, not a live call. The live quote is on the{" "}
            <a href="/hack">hackathon page</a>. The command-line tool can also read
            free-form sentences with a language model when a key is configured; the cap
            and the market guards still decide. Intents are the bridge from the NEAR
            Intents route DarkSwap uses today.
          </p>
        </aside>
      </div>
    </section>
  );
}
