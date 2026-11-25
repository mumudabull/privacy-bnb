// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title SwapMath
/// @notice Uniswap v2-style exact-input quote with a 0.30% fee.
library SwapMath {
    uint256 internal constant BPS = 10_000;
    uint256 internal constant FEE_BPS = 30;

    function quote(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) return 0;
        uint256 inWithFee = amountIn * (BPS - FEE_BPS);
        return (inWithFee * reserveOut) / (reserveIn * BPS + inWithFee);
    }
}
