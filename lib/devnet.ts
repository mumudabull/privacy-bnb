import { NETWORK } from "./network";

const POOL = NETWORK.shieldedPool;

const SELECTORS = {
  merkleRoot: "0x2eb4a7ab",
  pendingCount: "0xea70b4af",
  pendingHead: "0x5a0bc37c",
  depositPaused: "0x02befd24",
  totalShielded: "0x516b9ff0",
} as const;

export type ChainRead =
  | {
      ok: true;
      chainId: number;
      blockNumber: bigint;
      clientVersion: string;
    }
  | { ok: false; error: string };

export type PoolRead =
  | {
      ok: true;
      codeBytes: number;
      totalShieldedWei: bigint;
      merkleRoot: string;
      pendingCount: bigint;
      pendingHead: bigint;
      depositPaused: boolean;
    }
  | { ok: false; error: string };

export type DevnetSnapshot = {
  rpcUrl: string;
  fetchedAt: string;
  chain: ChainRead;
  pool: PoolRead;
};

function resolveRpcUrl(): string {
  const configured = process.env.NEWL1_RPC_URL?.trim();
  return configured && configured.length > 0 ? configured : NETWORK.rpcUrl;
}

async function rpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 15 },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) {
    throw new Error(body.error.message ?? "RPC error");
  }
  return body.result;
}

function asHex(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new Error(`${label} was not hex`);
  }
  return value;
}

function asUint(value: unknown, label: string): bigint {
  return BigInt(asHex(value, label));
}

async function readChain(url: string): Promise<ChainRead> {
  try {
    const [chainIdHex, blockHex, clientVersion] = await Promise.all([
      rpcCall(url, "eth_chainId", []),
      rpcCall(url, "eth_blockNumber", []),
      rpcCall(url, "web3_clientVersion", []),
    ]);
    if (typeof clientVersion !== "string") {
      throw new Error("client version missing");
    }
    return {
      ok: true,
      chainId: Number(asUint(chainIdHex, "chain id")),
      blockNumber: asUint(blockHex, "block"),
      clientVersion,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "chain read failed" };
  }
}

async function readPool(url: string): Promise<PoolRead> {
  try {
    const call = (data: string) =>
      rpcCall(url, "eth_call", [{ to: POOL, data }, "latest"]);
    const [code, total, root, count, head, paused] = await Promise.all([
      rpcCall(url, "eth_getCode", [POOL, "latest"]),
      call(SELECTORS.totalShielded),
      call(SELECTORS.merkleRoot),
      call(SELECTORS.pendingCount),
      call(SELECTORS.pendingHead),
      call(SELECTORS.depositPaused),
    ]);
    const codeHex = asHex(code, "code");
    const codeBytes = codeHex === "0x" ? 0 : (codeHex.length - 2) / 2;
    return {
      ok: true,
      codeBytes,
      totalShieldedWei: asUint(total, "totalShielded"),
      merkleRoot: asHex(root, "merkleRoot"),
      pendingCount: asUint(count, "pendingCount"),
      pendingHead: asUint(head, "pendingHead"),
      depositPaused: asUint(paused, "depositPaused") !== 0n,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "pool read failed" };
  }
}

export async function readDevnet(): Promise<DevnetSnapshot> {
  const rpcUrl = resolveRpcUrl();
  const [chain, pool] = await Promise.all([readChain(rpcUrl), readPool(rpcUrl)]);
  return {
    rpcUrl,
    fetchedAt: new Date().toISOString(),
    chain,
    pool,
  };
}
