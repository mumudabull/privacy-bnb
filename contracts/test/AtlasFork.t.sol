// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DemoAMM} from "../src/DemoAMM.sol";
import {IAggregatorV3} from "../src/IAggregatorV3.sol";
import {PublicRehearsal} from "../src/PublicRehearsal.sol";

interface IFeedDescription {
    function description() external view returns (string memory);
}

/// @notice Reads the Atlas BNB/USD SingleFeed on BSC testnet when BSC_TESTNET_RPC is set.
///         Skips otherwise. Does not deploy the rehearsal to a public network.
contract AtlasForkTest is Test {
    address internal constant FEED = 0x3957d289ee9C38272377786787ea34F9dd29788D;

    function test_realFeedGuardsThe555Pool() public {
        string memory rpc = vm.envOr("BSC_TESTNET_RPC", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpc);
        vm.deal(address(this), 20 ether);

        assertEq(IAggregatorV3(FEED).decimals(), 18);
        assertEq(IFeedDescription(FEED).description(), "SingleFeed BNB/USD");
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) =
            IAggregatorV3(FEED).latestRoundData();
        assertEq(roundId, 1);
        assertGt(answer, 0);
        assertGt(updatedAt, 0);
        assertTrue(answeredInRound == 0 || answeredInRound == roundId);

        DemoAMM amm = new DemoAMM{value: 10 ether}(5550 ether);
        PublicRehearsal rehearsal = new PublicRehearsal(amm, IAggregatorV3(FEED), 500, 1 hours);
        address alice = makeAddr("alice");
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 id = rehearsal.shield{value: 0.04 ether}();
        uint256 quoted = amm.quoteBnbToToken(0.04 ether);
        vm.prank(alice);
        (, uint256 tokensOut) = rehearsal.atomicSwap(id, quoted);
        assertEq(tokensOut, quoted);
    }
}
