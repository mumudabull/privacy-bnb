import { AgentSection } from "@/components/agent-section";
import { Architecture } from "@/components/architecture";
import { Bangkok } from "@/components/bangkok";
import { DevnetPanel } from "@/components/devnet-panel";
import { Flow } from "@/components/flow";
import { FunnelStrip } from "@/components/funnel-strip";
import { Hero } from "@/components/hero";
import { MarketCheck } from "@/components/market-check";
import { Roadmap } from "@/components/roadmap";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { readDevnet } from "@/lib/devnet";

export const revalidate = 15;

export default async function HomePage() {
  const status = await readDevnet();
  return (
    <>
      <SiteHeader />
      <main id="content">
        <div className="wrap">
          <FunnelStrip />
          <Hero status={status} />
          <Flow />
          <AgentSection />
          <Architecture />
          <DevnetPanel status={status} />
          <Roadmap />
          <MarketCheck />
          <Bangkok />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
