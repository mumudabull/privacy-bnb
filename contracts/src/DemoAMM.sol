// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DemoToken} from "./DemoToken.sol";
import {SwapMath} from "./SwapMath.sol";

/// @notice Constant-product BNB / rNOTE pool used as the public DEX inside the rehearsal.
contract DemoAMM {
    uint256 public constant FEE_BPS = SwapMath.FEE_BPS;

    DemoToken public immutable token;
    uint256 public reserveBnb;
    uint256 public reserveToken;

    error ZeroLiquidity();
    error Slippage(uint256 amountOut, uint256 minOut);
    error EmptySwap();

    event Swap(address indexed sender, uint256 bnbIn, uint256 tokenIn, uint256 bnbOut, uint256 tokenOut);

    constructor(uint256 tokenLiquidity) payable {
        if (msg.value == 0 || tokenLiquidity == 0) revert ZeroLiquidity();
        token = new DemoToken(address(this));
        token.mint(address(this), tokenLiquidity);
        reserveBnb = msg.value;
        reserveToken = tokenLiquidity;
    }

    function quoteBnbToToken(uint256 amountIn) external view returns (uint256) {
        return SwapMath.quote(amountIn, reserveBnb, reserveToken);
    }

    function quoteTokenToBnb(uint256 amountIn) external view returns (uint256) {
        return SwapMath.quote(amountIn, reserveToken, reserveBnb);
    }

    function swapExactBnbForToken(uint256 minOut) external payable returns (uint256 amountOut) {
        if (msg.value == 0) revert EmptySwap();
        amountOut = SwapMath.quote(msg.value, reserveBnb, reserveToken);
        if (amountOut < minOut) revert Slippage(amountOut, minOut);
        reserveBnb += msg.value;
        reserveToken -= amountOut;
        token.transfer(msg.sender, amountOut);
        emit Swap(msg.sender, msg.value, 0, 0, amountOut);
    }

    function swapExactTokenForBnb(uint256 amountIn, uint256 minOut) external returns (uint256 amountOut) {
        if (amountIn == 0) revert EmptySwap();
        amountOut = SwapMath.quote(amountIn, reserveToken, reserveBnb);
        if (amountOut < minOut) revert Slippage(amountOut, minOut);
        token.transferFrom(msg.sender, address(this), amountIn);
        reserveToken += amountIn;
        reserveBnb -= amountOut;
        (bool ok,) = msg.sender.call{value: amountOut}("");
        require(ok, "bnb transfer failed");
        emit Swap(msg.sender, 0, amountIn, amountOut, 0);
    }

    receive() external payable {}
}
