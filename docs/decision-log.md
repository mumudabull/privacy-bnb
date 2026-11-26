# DecisionLog

On-chain record of one guarded decision. The contract does not read Atlas, call CoinMarketCap, or move funds. The authorized agent supplies every field. Deployed on BSC testnet at [`0x0253Aff4b3493E86EeFfC03FD8b524688cfaFCa2`](https://testnet.bscscan.com/address/0x0253Aff4b3493E86EeFfC03FD8b524688cfaFCa2), verified on BscScan and Sourcify. Deploy transaction [`0xb5b094fc0538a5501e62de110c5f4c006147040d1fcd9cf4df2fa007a9f3dd8f`](https://testnet.bscscan.com/tx/0xb5b094fc0538a5501e62de110c5f4c006147040d1fcd9cf4df2fa007a9f3dd8f). Record 0 is pass, a 20 bps gap, and risk 34 (normal), written by the operator wallet in [`0x9746cb34f3e6fa500488f346f5de14cca9eda1d08892b468f311c5b60cc41bbd`](https://testnet.bscscan.com/tx/0x9746cb34f3e6fa500488f346f5de14cca9eda1d08892b468f311c5b60cc41bbd). Recording from the site is roadmap.

Source: `contracts/src/DecisionLog.sol`.

## Auth

The deployer is `owner`. The constructor argument is the first agent, taken from `DECISION_LOG_AGENT`. The owner is not an agent unless that same address is passed in.

`setAgent(address agent, bool allowed)` is owner-only. Address zero reverts. `agents(address)` returns whether that address may call `record`.

## Decisions

The enum is a `uint8`. The names and values are fixed:

| Value | Name | Meaning |
| --- | --- | --- |
| 0 | `pass` | The guard allowed the action |
| 1 | `block_gap` | Refused because the price gap was outside the band |
| 2 | `block_stale` | Refused because the Atlas round was stale |
| 3 | `block_cap` | Refused because the amount was over the cap |
| 4 | `quote_only` | A quote was recorded and nothing was broadcast |

## Record

`record` returns the id. Ids start at 0. `count` is the number of records.

| Field | Type | Unit |
| --- | --- | --- |
| `atlasPrice` | `uint256` | 18-decimal USD per BNB, the scaled Atlas answer. `0` if Atlas was not read |
| `cmcPrice` | `uint256` | 18-decimal USD per BNB, the same scaling the quote path uses for CoinMarketCap. `0` if CoinMarketCap was not read |
| `cmcResponseHash` | `bytes32` | sha256 of the raw CoinMarketCap response body. `bytes32(0)` when there was no body |
| `riskScore` | `uint8` | The `lib/risk.ts` score the writer submits. 0-39 normal, 40-69 caution, 70-100 quote-only. The contract does not compute it |
| `gapBps` | `uint256` | Integer basis points, not a percentage. The quote path uses `abs(pool - reference) * 10000 / reference` |
| `amount` | `uint256` | Wei of the amount the agent quoted or refused |
| `decision` | `uint8` | The enum above |
| `txRef` | `bytes32` | Transaction hash of a broadcast, or `bytes32(0)` when nothing was broadcast |

`records(uint256 id)` returns those fields plus `agent`, the `msg.sender` that wrote the row. A missing id reverts `UnknownRecord`.

`DecisionRecorded` is emitted once per record. Indexed fields are `id`, `agent`, and `decision`.

## Deploy

Deployed at [`0x0253Aff4b3493E86EeFfC03FD8b524688cfaFCa2`](https://testnet.bscscan.com/address/0x0253Aff4b3493E86EeFfC03FD8b524688cfaFCa2). Recording from the site is roadmap. A local wallet runs:

```bash
cd contracts
export DECISION_LOG_AGENT=0x...   # address that may call record
export PRIVATE_KEY=0x...          # not committed. This signer becomes owner
forge script script/DeployDecisionLog.s.sol --rpc-url bsc_testnet --broadcast
```

Local anvil uses `DEPLOY_SENDER` and `--unlocked` instead of `PRIVATE_KEY`, same as `Deploy.s.sol`.

## ABI

The JSON below is `forge inspect DecisionLog abi`.

```json
[
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "agent",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "agents",
    "inputs": [
      {
        "name": "agent",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "allowed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "count",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "record",
    "inputs": [
      {
        "name": "atlasPrice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cmcPrice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "cmcResponseHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "riskScore",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "gapBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "decision",
        "type": "uint8",
        "internalType": "enum DecisionLog.Decision"
      },
      {
        "name": "txRef",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "records",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct DecisionLog.Record",
        "components": [
          {
            "name": "atlasPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "cmcPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "cmcResponseHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "riskScore",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "gapBps",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "decision",
            "type": "uint8",
            "internalType": "enum DecisionLog.Decision"
          },
          {
            "name": "txRef",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "agent",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setAgent",
    "inputs": [
      {
        "name": "agent",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "AgentUpdated",
    "inputs": [
      {
        "name": "agent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "allowed",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DecisionRecorded",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "agent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "decision",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum DecisionLog.Decision"
      },
      {
        "name": "atlasPrice",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "cmcPrice",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "cmcResponseHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "riskScore",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "gapBps",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "txRef",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "NotAgent",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnknownRecord",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
]
```
