import { LINKS } from "@/lib/network";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>DarkSwap on BNB · BNB Bangkok</div>
          <nav className="footer-links" aria-label="Footer">
            <a href={LINKS.darkswap}>darkswap.app</a>
            <a href={LINKS.darkswapDocs}>Docs</a>
            <a href={LINKS.darkswapX}>@darkswapapp</a>
            <a href={LINKS.overview}>New L1 overview</a>
            <a href={LINKS.privacy}>Privacy</a>
            <a href={LINKS.agentSdk}>BNBAgent SDK</a>
          </nav>
        </div>
        <p className="legal">
          Hackathon build. It is separate from the production app at darkswap.app. The New
          L1 shielded pool hides what its proofs hide, on the devnet demo. This
          interface adds no privacy the chain does not already provide. Do not send real
          funds.
        </p>
      </div>
    </footer>
  );
}
