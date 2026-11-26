/**
 * Live reserves of the deployed public DemoAMM on BSC testnet.
 * reserveBnb() is 0xaed24cd3 and reserveToken() is 0xf4325d67.
 */

export const DEMO_AMM_ADDRESS = "0x7C5Cd03B1e554675b146844B7C8Ff3DE20F0Db2E";
export const DEFAULT_BSC_TESTNET_RPC = "https://bsc-testnet-dataseed.bnbchain.org";
const RESERVE_BNB = "0xaed24cd3";
const RESERVE_TOKEN = "0xf4325d67";
const CACHE_MS = 30_000;

export type PoolSnapshot =
  | {
      ok: true;
      address: string;
      reserveBnb: bigint;
      reserveToken: bigint;
    }
  | { ok: false; address: string };

let cache: { at: number; value: PoolSnapshot } | null = null;

export async function readDemoPool(): Promise<PoolSnapshot> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.value;
  const address = DEMO_AMM_ADDRESS;
  const rpc = process.env.RPC_URL_BSC_TESTNET?.trim() || DEFAULT_BSC_TESTNET_RPC;
  try {
    const response = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: address, data: RESERVE_BNB }, "latest"] },
        { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: address, data: RESERVE_TOKEN }, "latest"] },
      ]),
    });
    const body = (await response.json()) as { id?: number; result?: string }[];
    const bnb = word(body.find((item) => item.id === 1)?.result);
    const token = word(body.find((item) => item.id === 2)?.result);
    if (bnb === null || token === null || bnb === 0n || token === 0n) {
      return { ok: false, address };
    }
    const value: PoolSnapshot = { ok: true, address, reserveBnb: bnb, reserveToken: token };
    cache = { at: now, value };
    return value;
  } catch {
    return { ok: false, address };
  }
}

function word(payload: string | undefined): bigint | null {
  if (!payload || !payload.startsWith("0x")) return null;
  const hex = payload.slice(2);
  if (hex.length < 64) return null;
  return BigInt(`0x${hex.slice(0, 64)}`);
}
