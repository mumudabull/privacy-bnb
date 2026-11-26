import { LINKS } from "@/lib/network";

const NAV = [
  ["Flow", "/#flow"],
  ["Swap", "/swap"],
  ["Quote", "/#quote"],
  ["Architecture", "/#architecture"],
  ["Devnet", "/#devnet"],
  ["Market", "/#market"],
  ["Why", "/#why"],
  ["Roadmap", "/#roadmap"],
  ["Judging", "/#judging"],
  ["Hackathon build", "/hack"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div className="wrap header-inner">
        <a className="brand" href="/">
          <img src="/brand/logo.svg" width={36} height={36} alt="" />
          <strong>DarkSwap</strong>
          <span>on BNB</span>
        </a>
        <nav className="nav" aria-label="Page">
          {NAV.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <a className="header-external" href={LINKS.darkswap}>
          darkswap.app
        </a>
      </div>
    </header>
  );
}
