import { LINKS } from "@/lib/network";

export function AgentSection() {
  return (
    <section className="section" id="agent">
      <div className="split">
        <div>
          <p className="section-index">02 — The intent</p>
          <h2>Say the swap. The agent quotes it.</h2>
          <p className="section-lead">
            DarkSwap’s live routes already speak in intents. On BNB the same sentence is
            the interface: an agent with an ERC-8004 identity on BSC testnet reads it,
            quotes the pool, and refuses anything over a hard cap. Registration on BSC
            testnet is gas-free through MegaFuel. ERC-8183 can escrow a job. This
            hackathon build quotes and can execute the capped rehearsal. It does not take
            a fee. Other agents can call the quote tool over MCP at{" "}
            <code>/api/mcp</code> on this site. That endpoint is read-only and holds no
            key.
          </p>
          <p className="fine">
            SDK: <a href={LINKS.agentSdk}>BNB Agent SDK</a> ·{" "}
            <a href={LINKS.agentRepo}>bnbagent-sdk</a>. The page itself sends no
            transaction. A key stays in the environment, never in the repo.
          </p>
        </div>
        <aside className="quote-card" aria-label="Example intent">
          <div className="bubble user">
            <div className="who">You</div>
            <p>swap 0.1 bnb to the demo token, privately</p>
          </div>
          <div className="bubble agent">
            <div className="who">DarkSwap agent</div>
            <p>
              Quote on the rehearsal AMM. Cap is 0.05 BNB until a funded testnet wallet
              is configured. Execution is labeled public rehearsal unless a real 0x77
              proof is attached.
            </p>
          </div>
          <p className="note">
            Example copy, not a live model call. The command-line agent reads free-form
            sentences with a Claude model when a key is configured; the cap and the
            market guards still decide. Intents are the bridge from the NEAR Intents
            route DarkSwap uses today.
          </p>
        </aside>
      </div>
    </section>
  );
}
