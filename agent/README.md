# DarkSwap agent

A small agent that takes a sentence, quotes the public rehearsal, and refuses anything over **0.05 BNB**.

It does not submit a shielded proof. When it broadcasts, it broadcasts `PublicRehearsal` on whatever RPC you point at, and the result says so.

```bash
cd agent
PYTHONPATH=. python3 -m darkswap_agent quote "swap 0.1 bnb to rNOTE privately"
PYTHONPATH=. python3 -m darkswap_agent quote "swap 0.04 bnb to the demo token, privately"
PYTHONPATH=. python3 -m unittest discover -s tests
```

`0.1` is quoted and refused. `0.04` is quoted. `execute` broadcasts only when all three are set:

```bash
export RPC_URL=http://127.0.0.1:8545
export REHEARSAL=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512   # anvil address from contracts/README.md
export SENDER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266       # anvil account 0, unlocked
PYTHONPATH=. python3 -m darkswap_agent execute "swap 0.01 bnb to rNOTE privately"
```

`SENDER` must be unlocked on that node (`anvil`, or `forge` `--unlocked`). This path does not read `PRIVATE_KEY`. A remote testnet that is not unlocked needs a signer; that signer is intentionally not built here, so a key never has to land in this process for the demo. Use `contracts/script/DemoFlow.s.sol` with `PRIVATE_KEY` for BSC testnet or New L1 once the address is funded.

## ERC-8004

```bash
pip install -r requirements.txt
export PRIVATE_KEY=0x...          # throwaway BSC testnet key, not committed
export WALLET_PASSWORD='...'      # encrypts the SDK keystore
PYTHONPATH=. python3 -m darkswap_agent register
```

Registration uses `bnbagent` 0.5.1 on `bsc-testnet` (chain 97). The SDK preset registry is `0x8004A818BFB912233c491871b3d84c89A494BD9e`. Docs say MegaFuel sponsors this transaction, so the key does not need tBNB to register. This environment had no `PRIVATE_KEY`, so no agent id was minted.

## MCP

`python3 -m darkswap_agent mcp` speaks newline-delimited JSON-RPC (MCP stdio, 2024-11-05): `initialize`, `tools/list`, and `tools/call` for `quote_swap`. The tool quotes and applies the cap. It does not broadcast and it does not take an x402 payment. Execution only proceeds for rNOTE, and the on-chain swap uses the live pool quote as its minimum output. ERC-8183 escrow is the SDK’s job flow; this hackathon build stops at identity-ready registration plus the capped quote.
