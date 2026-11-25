// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {PublicRehearsal} from "../src/PublicRehearsal.sol";

/// @notice Runs shield -> atomicSwap -> withdrawToken on an already deployed rehearsal.
///         Set REHEARSAL to the deployed address. Same signer rules as Deploy.s.sol.
contract DemoFlow is Script {
    function run() external {
        PublicRehearsal rehearsal = PublicRehearsal(payable(vm.envAddress("REHEARSAL")));
        uint256 amount = vm.envOr("DEMO_AMOUNT_WEI", uint256(0.01 ether));
        uint256 quoted = rehearsal.amm().quoteBnbToToken(amount);
        uint256 minOut = vm.envOr("MIN_OUT_WEI", quoted);
        if (minOut == 0) {
            console2.log("Refusing the swap. The quoted minimum is zero.");
            revert("zero min out");
        }
        console2.log("quote", quoted);
        console2.log("min out", minOut);

        uint256 key = vm.envOr("PRIVATE_KEY", uint256(0));
        if (key != 0) vm.startBroadcast(key);
        else vm.startBroadcast(vm.envAddress("DEPLOY_SENDER"));

        uint256 bnbNote = rehearsal.shield{value: amount}();
        (uint256 tokenNote, uint256 tokensOut) = rehearsal.atomicSwap(bnbNote, minOut);
        uint256 withdrawn = rehearsal.withdrawToken(tokenNote);
        vm.stopBroadcast();

        console2.log("shield note", bnbNote);
        console2.log("token note", tokenNote);
        console2.log("tokens out", tokensOut);
        console2.log("withdrawn", withdrawn);
        console2.log("Public rehearsal only. rNOTE is not inside ShieldedPool.");
    }
}
