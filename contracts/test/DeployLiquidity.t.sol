// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Deploy} from "../script/Deploy.s.sol";
import {DemoAMM} from "../src/DemoAMM.sol";

/// @notice The deploy script used to divide rNOTE liquidity by 1 ether.
///         AMM_TOKEN_LIQUIDITY=27750000000000000000 was the wei workaround for a 0.05 BNB seed.
contract DeployLiquidityTest is Test {
    uint256 internal constant BNB_SEED = 0.05 ether;
    uint256 internal constant RATIO = 555;
    /// @dev 0.05 BNB * 555 rNOTE, in wei. This is the value the first BSC deploy had to pass explicitly.
    uint256 internal constant RNOTE_WEI = 27_750000000000000000;

    function test_defaultTokenLiquidityIsWei() public {
        Deploy deploy = new Deploy();
        uint256 corrected = deploy.tokenLiquidityWei(BNB_SEED, RATIO);
        uint256 broken = BNB_SEED * RATIO / 1 ether;

        assertEq(corrected, RNOTE_WEI);
        assertEq(corrected, 27.75 ether);
        assertEq(broken, 27);
        assertTrue(corrected != broken);

        assertEq(deploy.tokenLiquidityWei(10 ether, RATIO), 5550 ether);
        assertEq(10 ether * RATIO / 1 ether, 5550);
    }

    function test_explicitOverrideStaysInWei() public {
        vm.setEnv("AMM_TOKEN_LIQUIDITY", "27750000000000000000");
        Deploy deploy = new Deploy();
        uint256 resolved = deploy.resolveTokenLiquidity(BNB_SEED, RATIO);
        assertEq(resolved, RNOTE_WEI);
        assertEq(resolved, 27.75 ether);
    }

    function test_correctedSeedMatchesTheWorkaroundPool() public {
        uint256 corrected = new Deploy().tokenLiquidityWei(BNB_SEED, RATIO);
        DemoAMM amm = new DemoAMM{value: BNB_SEED}(corrected);
        assertEq(amm.reserveBnb(), BNB_SEED);
        assertEq(amm.reserveToken(), RNOTE_WEI);
        assertEq(amm.token().totalSupply(), RNOTE_WEI);
        assertEq(amm.reserveToken() * 1e18 / amm.reserveBnb(), 555 ether);
        assertGt(amm.quoteBnbToToken(0.01 ether), 1 ether);

        uint256 broken = BNB_SEED * RATIO / 1 ether;
        DemoAMM dust = new DemoAMM{value: BNB_SEED}(broken);
        assertEq(dust.reserveToken(), 27);
        assertLt(dust.quoteBnbToToken(0.01 ether), 1 ether);
    }
}
