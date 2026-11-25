#!/usr/bin/env bash
# Read-only probe of the New L1 devnet shielded pool. Sends no transaction.
set -euo pipefail

RPC="${NEWL1_RPC_URL:-https://newl1-devnet-rpc.bnbchain.org/}"
POOL="${SHIELDED_POOL:-0x0000000000000000000000000000000000005000}"

echo "rpc          $RPC"
echo "chain id     $(cast chain-id --rpc-url "$RPC")"
echo "block        $(cast block-number --rpc-url "$RPC")"
echo "client       $(cast client --rpc-url "$RPC")"
echo "pool         $POOL"
echo "code bytes   $(cast codesize "$POOL" --rpc-url "$RPC")"
echo "totalShielded $(cast call "$POOL" "totalShielded()(uint256)" --rpc-url "$RPC")"
echo "merkleRoot   $(cast call "$POOL" "merkleRoot()(uint256)" --rpc-url "$RPC")"
echo "pendingCount $(cast call "$POOL" "pendingCount()(uint256)" --rpc-url "$RPC")"
echo "pendingHead  $(cast call "$POOL" "pendingHead()(uint256)" --rpc-url "$RPC")"
echo "depositPaused $(cast call "$POOL" "depositPaused()(bool)" --rpc-url "$RPC")"
echo
echo "Read only. privDeposit and transact need a funded devnet account and, for a spend, newl1-shield proofs."
echo "This script does not claim a private transfer."
