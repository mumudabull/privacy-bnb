# Public rehearsal

A Foundry demo of shield → swap → reshield. It is public on purpose.

| Piece | What it is |
| --- | --- |
| `IShieldedPool` | Interface whose selectors match the live New L1 devnet pool at `0x0000000000000000000000000000000000005000` |
| `DemoAMM` + `DemoToken` (`rNOTE`) | Constant-product pool, 0.30% fee. Not `$DARK` |
| `PublicRehearsal` | Cleartext notes. No proof, no type `0x77`, not the system pool |
| `script/probe-devnet.sh` | Read-only `cast` calls against the real pool |

`atomicSwap` spends a BNB note, swaps to rNOTE, and records an open note. New L1 can reshield native BNB only, so that token note cannot exist inside ShieldedPool. `reshieldBnb` is the native-only step the real pool can do, still stored in the clear here.

## Test

```bash
forge test
```

The 0.1 BNB quote against 10 BNB / 10,000 rNOTE is `98715803439706129885` wei of rNOTE (`98.715…`). The Next.js quote uses the same integer math.

## Probe the real pool

```bash
./script/probe-devnet.sh
```

Requires `cast`. Sends nothing.

## Run the rehearsal on a local anvil

Anvil account 0 is unlocked. This uses the address only. Do not paste a private key into the repo.

```bash
anvil
# another shell, from contracts/
export DEPLOY_SENDER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --unlocked --sender $DEPLOY_SENDER
export REHEARSAL=<PublicRehearsal address from the log>
export DEMO_AMOUNT_WEI=10000000000000000
forge script script/DemoFlow.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --unlocked --sender $DEPLOY_SENDER
```

On chain 31337 with `ORACLE_FEED` unset, the script deploys a `MockAggregator` priced at the pool spot (`reserveToken / reserveBnb`, 1 rNOTE = 1 USD) and wires it in. The log says it is not an Atlas feed. The guard compares that spot, so a 0.01 BNB trade on a 0.05 BNB / 50 rNOTE pool still passes a 500 bps band when the feed matches the spot. Trade slippage is the `minOut` check.

## Deploy on BSC testnet or New L1 devnet

Stop here unless you already have a throwaway key and testnet funds. This repo does not contain a key.

```bash
export PRIVATE_KEY=0x...   # not committed
export AMM_BNB_LIQUIDITY=50000000000000000      # 0.05 tBNB seeded into the AMM
export AMM_TOKEN_LIQUIDITY=50000000000000000000 # 50 rNOTE, same 1:1000 price as the 10 / 10,000 seed
forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast
```

Also set `ORACLE_FEED` to an AggregatorV3 you have verified. The deploy script refuses a zero address. On 25 Nov 2026 the public Atlas catalog had no BNB/USD SingleFeed on BSC testnet (chain 97). Do not paste `0xeace519ebb14fb8404fa6ddd23c3b34abade44aa`; that contract is shared by other BNB Chain pairs in the catalog and was not verified as this feed. Optional: `MAX_DEVIATION_BPS` (default 500) and `MAX_STALE_SECONDS` (default 3600).

Fund the `PRIVATE_KEY` address with **0.2 tBNB** before that command.

- 0.05 tBNB is locked as AMM liquidity.
- The deploy used about 2,006,377 gas in a local run. At 10 gwei that is about 0.02 tBNB. New L1 charges the declared gas limit, so the same transaction can cost more than gas-used.
- 0.01 tBNB is enough for one demo swap under the agent cap.
- 0.2 tBNB covers those three with room. The script default without `AMM_BNB_LIQUIDITY` is 10 tBNB of liquidity, which a faucet will not supply.

`PRIVATE_KEY` is the only signer variable. BSC testnet is chain id 97. Get tBNB from the [BSC faucet](https://www.bnbchain.org/en/testnet-faucet). RPC name in `foundry.toml`: `bsc_testnet`.

New L1 devnet (chain id 1105) has no faucet. Bridge that same tBNB from BSC testnet, then use `--rpc-url newl1_devnet`. The devnet may reset. The pool and the bridge are unaudited.

`DemoFlow` quotes the AMM and passes that amount as `minOut`. A worse fill reverts. `MIN_OUT_WEI` overrides the quote.

This environment did not have `PRIVATE_KEY` or a funded deployer, so nothing was deployed to BSC testnet or New L1.

A local anvil run of the scripts above (chain id 31337, ephemeral) produced:

| Contract | Address |
| --- | --- |
| DemoAMM | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| DemoToken (rNOTE) | `0xa16E02E87b7454126E5E10d957A927A7F5B5d2be` |
| PublicRehearsal | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |

`DemoFlow` then shielded 0.01 BNB, swapped, and withdrew `9960069810399032164` wei of rNOTE (about 9.960 rNOTE). Those addresses are Anvil’s first-deploy nonce sequence. They are not on BSC testnet or New L1, and they vanish when the node stops.
