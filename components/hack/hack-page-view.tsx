/**
 * File: components/hack/hack-page-view.tsx
 * Purpose: Renders the hackathon page in one language. The English route
 * (/hack) and the Chinese route (/hack/zh) both use this view, so their
 * structure cannot drift apart; only the text in lib/hack-copy.ts differs.
 */

import { ArrowRight, Check, Clock } from "lucide-react";
import { AgentConsole } from "@/components/hack/agent-console";
import { HACK_COPY, HACK_LANGUAGE_TAGS, HACK_PATHS, type HackLocale } from "@/lib/hack-copy";
import { LINKS } from "@/lib/network";

type HackPageViewProps = {
  locale: HackLocale;
  /** Extra class names, used by the Chinese route to attach its font variable. */
  className?: string;
};

export function HackPageView({ locale, className }: HackPageViewProps) {
  const copy = HACK_COPY[locale];
  const pageClassName = className ? `hack-page ${className}` : "hack-page";

  return (
    // The root layout declares English. This attribute corrects the language
    // for everything inside the page, which also selects the right typography.
    <div className={pageClassName} lang={HACK_LANGUAGE_TAGS[locale]}>
      {/* Decorative rail that fills from lavender to gold as the page scrolls. */}
      <div className="hack-rail" aria-hidden />

      <header className="hack-header">
        <a className="hack-brand" href="/" lang="en">
          <img src="/brand/logo.svg" width={40} height={40} alt="" />
          <span>
            DarkSwap <span>on BNB</span>
          </span>
        </a>
        <nav aria-label={copy.navigationLabel}>
          <a href="/">{copy.navigationTechnicalPage}</a>
          <a href={LINKS.repository}>{copy.navigationCode}</a>
          <a
            className="hack-language-switch"
            href={HACK_PATHS[copy.otherLanguage.locale]}
            lang={HACK_LANGUAGE_TAGS[copy.otherLanguage.locale]}
            hrefLang={HACK_LANGUAGE_TAGS[copy.otherLanguage.locale]}
          >
            {copy.otherLanguage.label}
          </a>
        </nav>
      </header>

      <main id="content">
        <section className="hack-hero">
          <div className="hack-hero-copy">
            <video
              className="hack-warp"
              autoPlay
              muted
              playsInline
              poster="/brand/final-v3-512.png"
              aria-label="DarkSwap mark warping into the BNB logo"
            >
              <source src="/brand/warp.webm" type="video/webm" />
              <source src="/brand/warp.mp4" type="video/mp4" />
            </video>
            <img className="hack-warp-still" src="/brand/logo.svg" alt="DarkSwap on BNB" />
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroBody}</p>
            <p className="hack-hero-note">{copy.heroNote}</p>
          </div>
          <AgentConsole locale={locale} />
        </section>

        <section className="hack-lineage" aria-labelledby="hack-lineage-title">
          <h2 id="hack-lineage-title">{copy.lineageTitle}</h2>
          <ol>
            {copy.lineage.map((step) => (
              <li key={step.name}>
                <h3>{step.name}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="hack-ledger" aria-labelledby="hack-ledger-title">
          <h2 id="hack-ledger-title">{copy.ledgerTitle}</h2>
          <div className="hack-ledger-columns">
            <div>
              <h3>{copy.worksTodayTitle}</h3>
              <ul>
                {copy.worksToday.map((item) => (
                  <li key={item}>
                    <Check size={18} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>{copy.waitsTitle}</h3>
              <ul>
                {copy.waits.map((item) => (
                  <li key={item}>
                    <Clock size={18} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="hack-path" aria-labelledby="hack-path-title">
          <h2 id="hack-path-title">{copy.pathTitle}</h2>
          <ol>
            {copy.path.map((step) => (
              <li key={step.when}>
                <p className="hack-path-when">{step.when}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="hack-path-caveat">
            {copy.pathCaveatBeforeLink}
            <a href={LINKS.faq}>{copy.pathCaveatLink}</a>
            {copy.pathCaveatAfterLink}
          </p>
        </section>

        <section className="hack-close" aria-labelledby="hack-close-title">
          <h2 id="hack-close-title">{copy.closeTitle}</h2>
          <p>{copy.closeBody}</p>
          <div className="hack-close-actions">
            <a className="hack-button" href={LINKS.darkswapX}>
              {copy.closeFollow} <ArrowRight size={18} aria-hidden />
            </a>
            <a className="hack-button hack-button-quiet" href={LINKS.repository}>
              {copy.closeCode}
            </a>
            <a className="hack-button hack-button-quiet" href={LINKS.darkswap}>
              {copy.closeSolana}
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
