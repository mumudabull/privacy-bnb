/**
 * File: lib/hack-copy.ts
 * Purpose: All visible text for the hackathon page (/hack) in English and
 * Simplified Chinese. The page and the quote console both read from here, so
 * the two languages always carry the same sections in the same order.
 */

import type { AgentQuote, AgentQuoteStatus, MarketSummary } from "./agent-quote.ts";
import { TESTNET_READONLY_NOTE } from "./testnet-note.ts";

export type HackLocale = "en" | "zh";

/** BCP 47 tags used for the `lang` attribute. */
export const HACK_LANGUAGE_TAGS: Record<HackLocale, string> = {
  en: "en",
  zh: "zh-Hans",
};

export const HACK_PATHS: Record<HackLocale, string> = {
  en: "/hack",
  zh: "/hack/zh",
};

/** The one sentence shape the agent parses. It stays in English in every locale. */
const CANONICAL_SENTENCE = "swap 0.04 bnb to rNOTE privately";

type TitledParagraph = { name: string; body: string };
type PathStep = { when: string; title: string; body: string };

export type HackConsoleCopy = {
  inputLabel: string;
  submit: string;
  submitting: string;
  examplesLabel: string;
  examples: readonly { label: string; sentence: string }[];
  idleHint: string;
  statusHeadlines: Record<AgentQuoteStatus, string>;
  fieldSell: string;
  fieldPoolQuote: string;
  fieldExecutionCap: string;
  fieldMarketCheck: string;
  /** Explanation shown under the status line, or undefined when none applies. */
  describeReason: (quote: AgentQuote) => string | undefined;
  describeMarket: (market: MarketSummary) => string;
  describeUnsupportedAsset: (assetName: string) => string;
  privacyLine: string;
  /** Same fact as TESTNET_READONLY_NOTE, in this page's language. */
  readonlyNote: string;
  /** Small label on the quote control. The live feed is not connected yet. */
  demoBadge: string;
  /** Shown when /api/mcp fails. No price is invented. */
  demoFallback: string;
  errorEndpointStatus: (httpStatus: number) => string;
  errorNoAnswer: string;
  errorGeneric: string;
};

export type HackPageCopy = {
  metadataTitle: string;
  metadataDescription: string;
  navigationLabel: string;
  navigationTechnicalPage: string;
  navigationCode: string;
  /** Link to the other language, written in that language. */
  otherLanguage: { locale: HackLocale; label: string };
  heroTitle: string;
  heroBody: string;
  heroNote: string;
  lineageTitle: string;
  lineage: readonly TitledParagraph[];
  ledgerTitle: string;
  worksTodayTitle: string;
  worksToday: readonly string[];
  waitsTitle: string;
  waits: readonly string[];
  pathTitle: string;
  path: readonly PathStep[];
  pathCaveatBeforeLink: string;
  pathCaveatLink: string;
  pathCaveatAfterLink: string;
  closeTitle: string;
  closeBody: string;
  closeFollow: string;
  closeCode: string;
  closeSolana: string;
  console: HackConsoleCopy;
};

const EXAMPLE_SENTENCES = {
  underCap: CANONICAL_SENTENCE,
  overCap: "swap 0.1 bnb to rNOTE privately",
  notASwap: "send everything to me",
} as const;

function bandPercent(market: MarketSummary): number {
  return market.maxDeviationBps / 100;
}

const ENGLISH: HackPageCopy = {
  metadataTitle: "The hackathon build · DarkSwap on BNB",
  metadataDescription:
    "Say a swap in a sentence. A guarded agent quotes it on BNB testnet, refuses what breaks its limits, and does not move funds.",
  navigationLabel: "Hackathon page",
  navigationTechnicalPage: "Technical page",
  navigationCode: "Code",
  otherLanguage: { locale: "zh", label: "中文" },
  heroTitle: "Say the swap. The agent holds the line.",
  heroBody:
    "DarkSwap on BNB is a swap agent that takes a plain sentence, quotes it, and refuses anything that breaks its limits. The quote runs against BNB testnet and is built for the shielded pool on BNB Chain’s New L1. This page does not send a swap.",
  heroNote:
    "Built for the BNB Chain hackathon, November 2026. What you can try here is a public quote on BNB testnet. This page does not send a swap or move funds.",
  lineageTitle: "From purple to gold",
  lineage: [
    {
      name: "Solana roots",
      body: "DarkSwap started as a private swap for Solana users. That app is live at darkswap.app and is not changed by this build.",
    },
    {
      name: "Private routing",
      body: "darkswap.app: live private swaps (private routing) and Multi Exchange, with real users.",
    },
    {
      name: "BNB shield",
      body: "BNB Chain’s New L1 has a shielded pool built into the protocol. It is where this swap is designed to settle once that network opens.",
    },
  ],
  ledgerTitle: "What works, and what waits",
  worksTodayTitle: "Works today",
  worksToday: [
    "An agent reads a swap sentence and quotes it against a pool.",
    "A hard cap refuses anything above 0.05 BNB.",
    "A CoinMarketCap check refuses a quote that strays from the market price.",
    "An on-chain oracle guard refuses a stale or divergent price. This page only quotes.",
    "Other agents can call the quote over MCP at /api/mcp on this site.",
    "The New L1 devnet shielded pool is read live, without a key.",
  ],
  waitsTitle: "Waits on New L1",
  waits: [
    "A private swap. Spending a shielded note needs a proof tool that BNB Chain has not published.",
    "Tokens other than native BNB inside the shielded pool.",
    "A relayer, so the sender does not pay gas from a public address.",
    "For LPs: dark pools on BNB, for higher yield and arbitrage flow from private order routing. Roadmap, not live.",
    "An audit of the circuits. The devnet pool is unaudited.",
  ],
  pathTitle: "The path onto BNB",
  path: [
    {
      when: "Now",
      title: "Quote with the agent",
      body: "Try the quote above, or point your own agent at the MCP endpoint. Everything it does is public and capped.",
    },
    {
      when: "Public testnet",
      title: "Shield BNB",
      body: "Deposit native BNB into the shielded pool from the agent. BNB Chain’s planning target for the testnet is Q1 2027.",
    },
    {
      when: "Mainnet",
      title: "Swap privately, and bring your route",
      body: "Private swaps on New L1 for darkswap.app users. BNB Chain’s planning target is H2 2027.",
    },
  ],
  pathCaveatBeforeLink: "The testnet and mainnet dates are BNB Chain’s planning targets from its ",
  pathCaveatLink: "New L1 FAQ",
  pathCaveatAfterLink: ", not a DarkSwap launch promise.",
  closeTitle: "Follow the build",
  closeBody:
    "The code is open. Updates on the New L1 integration are posted as the network moves from devnet to testnet.",
  closeFollow: "Follow DarkSwap on X",
  closeCode: "Read the code",
  closeSolana: "Use DarkSwap on Solana",
  console: {
    inputLabel: "Say the swap",
    submit: "Get a quote",
    submitting: "Quoting",
    examplesLabel: "Example sentences",
    examples: [
      { label: "A swap under the cap", sentence: EXAMPLE_SENTENCES.underCap },
      { label: "A swap over the cap", sentence: EXAMPLE_SENTENCES.overCap },
      { label: "Not a swap", sentence: EXAMPLE_SENTENCES.notASwap },
    ],
    idleHint: "The answer comes from this site’s public agent endpoint. Nothing is signed or sent.",
    readonlyNote: TESTNET_READONLY_NOTE,
    demoBadge: "Demo until live",
    demoFallback: "Live quote is in demo mode until the market data feed is connected.",
    statusHeadlines: {
      quoted: "Quoted",
      refused: "Refused: above the cap",
      market_refused: "Refused: outside the market band",
      rejected: "Not a swap this agent accepts",
    },
    fieldSell: "You sell",
    fieldPoolQuote: "Pool quote",
    fieldExecutionCap: "Execution cap",
    fieldMarketCheck: "Market check",
    // The endpoint already answers in English, so its own reason is shown as is.
    describeReason: (quote) => quote.reason,
    describeMarket: (market) => {
      const atlas =
        market.atlas.priceUsd === null
          ? "Atlas was not read."
          : `Atlas ${market.atlas.priceUsd}, ${market.atlas.deviationBps} bps from the pool at ${market.ammImpliedUsd}.`;
      const cmc =
        market.cmcDecision === "skipped"
          ? "cmc: key not configured"
          : `CMC ${market.cmcUsd}, HTTP ${market.cmcHttpStatus ?? "unread"}, ${market.cmcFetchedAt ?? "unread"}, sha ${market.cmcSha256 ?? "unread"}.`;
      const risk = market.riskScore == null ? "Risk unread." : `Risk ${market.riskScore} ${market.riskTier}.`;
      switch (market.decision) {
        case "pass":
          return `${atlas} ${cmc} ${risk} Inside the ${bandPercent(market)}% band.`;
        case "refuse":
          return `${atlas} ${cmc} ${risk} Outside the ${bandPercent(market)}% band.`;
        case "unavailable":
          return `${atlas} ${cmc} ${risk} The on-chain check did not complete.`;
        case "skipped":
          return `${atlas} ${cmc} ${risk}`;
      }
    },
    describeUnsupportedAsset: (assetName) =>
      `${assetName} is not executable. This page only quotes BNB for rNOTE.`,
    privacyLine:
      "Public rehearsal. Owners and amounts are visible. This is not a type 0x77 shielded transfer and not ShieldedPool.",
    errorEndpointStatus: (httpStatus) =>
      `The quote endpoint answered ${httpStatus}. Try again in a moment.`,
    errorNoAnswer: "The quote endpoint returned no answer.",
    errorGeneric: "The quote could not be fetched.",
  },
};

const CHINESE: HackPageCopy = {
  metadataTitle: "黑客松构建 · DarkSwap on BNB",
  metadataDescription:
    "用一句话说出兑换。带防护的智能体在 BNB 测试网上给出报价，拒绝超出限制的请求，不会转移资金。",
  navigationLabel: "黑客松页面",
  navigationTechnicalPage: "技术页面",
  navigationCode: "代码",
  otherLanguage: { locale: "en", label: "English" },
  heroTitle: "说出你的兑换，智能体守住底线。",
  heroBody:
    "DarkSwap on BNB 是一个兑换智能体：它读懂一句普通的话，给出报价，并拒绝任何超出限制的请求。报价针对 BNB 测试网，并为 BNB Chain 新 L1 的屏蔽池而构建。本页面不会发送兑换。",
  heroNote:
    "为 2026 年 11 月的 BNB Chain 黑客松而构建。这里可以体验的是 BNB 测试网上的公开报价。本页面不会发送兑换，也不会转移资金。",
  lineageTitle: "从紫到金",
  lineage: [
    {
      name: "Solana 起点",
      body: "DarkSwap 最初是面向 Solana 用户的隐私兑换。该应用已在 darkswap.app 上线，本次构建不会改动它。",
    },
    {
      name: "隐私路由",
      body: "darkswap.app：已上线的隐私兑换（隐私路由）和 Multi Exchange，有真实用户。",
    },
    {
      name: "BNB 屏蔽",
      body: "BNB Chain 的新 L1 在协议层内置了屏蔽池。待该网络开放后，这笔兑换将在那里结算。",
    },
  ],
  ledgerTitle: "已经可用的，和仍在等待的",
  worksTodayTitle: "今天可用",
  worksToday: [
    "智能体读取一句兑换指令，并按资金池给出报价。",
    "硬性上限会拒绝任何超过 0.05 BNB 的请求。",
    "CoinMarketCap 价格检查会拒绝偏离市场价的报价。",
    "链上预言机防护会拒绝过期或偏离的价格。本页面只提供报价。",
    "其他智能体可以通过本站的 /api/mcp，以 MCP 协议调用报价。",
    "无需密钥即可实时读取新 L1 开发网的屏蔽池。",
  ],
  waitsTitle: "等待新 L1",
  waits: [
    "隐私兑换。花费屏蔽票据需要证明工具，而 BNB Chain 尚未发布该工具。",
    "屏蔽池内除原生 BNB 以外的代币。",
    "中继器，让发送方不必从公开地址支付 gas。",
    "面向 LP：把流动性放进 BNB 上的 DarkSwap 暗池，以获得更高收益，并承接隐私订单路由的套利流。路线图，尚未上线。",
    "电路审计。开发网的屏蔽池尚未经过审计。",
  ],
  pathTitle: "通往 BNB 的路线",
  path: [
    {
      when: "现在",
      title: "用智能体获取报价",
      body: "试试上面的报价，或让你自己的智能体接入 MCP 端点。它所做的一切都是公开且有上限的。",
    },
    {
      when: "公开测试网",
      title: "屏蔽 BNB",
      body: "通过智能体把原生 BNB 存入屏蔽池。BNB Chain 对测试网的规划目标是 2027 年第一季度。",
    },
    {
      when: "主网",
      title: "隐私兑换，并带上你的路线",
      body: "在新 L1 上为 darkswap.app 用户做隐私兑换。BNB Chain 的规划目标是 2027 年下半年。",
    },
  ],
  pathCaveatBeforeLink: "测试网和主网的日期是 BNB Chain 在其",
  pathCaveatLink: "新 L1 常见问题",
  pathCaveatAfterLink: "中给出的规划目标，并非 DarkSwap 的上线承诺。",
  closeTitle: "关注构建进展",
  closeBody: "代码已开源。随着网络从开发网走向测试网，新 L1 集成的进展会持续更新。",
  closeFollow: "在 X 上关注 DarkSwap",
  closeCode: "查看代码",
  closeSolana: "在 Solana 上使用 DarkSwap",
  console: {
    inputLabel: "说出你的兑换",
    submit: "获取报价",
    submitting: "报价中",
    examplesLabel: "示例指令",
    examples: [
      { label: "低于上限的兑换", sentence: EXAMPLE_SENTENCES.underCap },
      { label: "超过上限的兑换", sentence: EXAMPLE_SENTENCES.overCap },
      { label: "不是兑换", sentence: EXAMPLE_SENTENCES.notASwap },
    ],
    idleHint: `回答来自本站公开的智能体端点，不会签名，也不会发送任何交易。目前只识别英文指令，例如：${CANONICAL_SENTENCE}`,
    readonlyNote: "测试网演示：兑换在 BNB 测试网上是只读的，不会转移真实资金。",
    demoBadge: "演示，上线前",
    demoFallback: "在市场数据源接通之前，实时报价处于演示模式。",
    statusHeadlines: {
      quoted: "已报价",
      refused: "已拒绝：超过上限",
      market_refused: "已拒绝：超出市场价区间",
      rejected: "智能体不接受这条指令",
    },
    fieldSell: "卖出",
    fieldPoolQuote: "资金池报价",
    fieldExecutionCap: "执行上限",
    fieldMarketCheck: "市场检查",
    // The endpoint answers in English, so each outcome is restated here in Chinese.
    describeReason: (quote) => {
      switch (quote.status) {
        case "refused":
          return `超过 ${quote.executionCapBnb} BNB 的执行上限，仅提供报价。`;
        case "market_refused":
          return "资金池隐含的 BNB 价格超出了 CoinMarketCap 的允许区间。";
        case "rejected":
          return `请用英文这样说：${CANONICAL_SENTENCE}`;
        case "quoted":
          return undefined;
      }
    },
    describeMarket: (market) => {
      const atlas =
        market.atlas.priceUsd === null
          ? "未能读取 Atlas。"
          : `Atlas ${market.atlas.priceUsd}，与资金池 ${market.ammImpliedUsd} 相差 ${market.atlas.deviationBps} bps。`;
      const cmc =
        market.cmcDecision === "skipped"
          ? "cmc: key not configured"
          : `CMC ${market.cmcUsd}，HTTP ${market.cmcHttpStatus ?? "unread"}，${market.cmcFetchedAt ?? "unread"}，sha ${market.cmcSha256 ?? "unread"}。`;
      const risk = market.riskScore == null ? "风险未读取。" : `风险 ${market.riskScore} ${market.riskTier}。`;
      switch (market.decision) {
        case "pass":
          return `${atlas}${cmc}${risk}在 ${bandPercent(market)}% 区间内。`;
        case "refuse":
          return `${atlas}${cmc}${risk}超出 ${bandPercent(market)}% 区间。`;
        case "unavailable":
          return `${atlas}${cmc}${risk}链上检查没有完成。`;
        case "skipped":
          return `${atlas}${cmc}${risk}`;
      }
    },
    describeUnsupportedAsset: (assetName) =>
      `${assetName} 无法执行。本页面只对 BNB 兑换 rNOTE 提供报价。`,
    privacyLine:
      "公开演练。所有者和金额均可见。这不是 0x77 类型的屏蔽转账，也没有使用 ShieldedPool。",
    errorEndpointStatus: (httpStatus) => `报价端点返回了 ${httpStatus}。请稍后再试。`,
    errorNoAnswer: "报价端点没有返回结果。",
    errorGeneric: "无法获取报价。",
  },
};

export const HACK_COPY: Record<HackLocale, HackPageCopy> = {
  en: ENGLISH,
  zh: CHINESE,
};
