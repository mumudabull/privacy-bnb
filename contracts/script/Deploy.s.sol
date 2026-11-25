// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {DemoAMM} from "../src/DemoAMM.sol";
import {PublicRehearsal} from "../src/PublicRehearsal.sol";

/// @notice Deploys the public rehearsal. Refuses to invent a key.
///         Local anvil: set DEPLOY_SENDER to an unlocked account and pass --unlocked.
///         BSC testnet or New L1 devnet: set PRIVATE_KEY and fund that address.
contract Deploy is Script {
    function run() external {
        uint256 bnbLiquidity = vm.envOr("AMM_BNB_LIQUIDITY", uint256(10 ether));
        uint256 tokenLiquidity = vm.envOr("AMM_TOKEN_LIQUIDITY", uint256(10_000 ether));
        uint256 key = vm.envOr("PRIVATE_KEY", uint256(0));

        if (key != 0) {
            vm.startBroadcast(key);
        } else {
            address sender = vm.envOr("DEPLOY_SENDER", address(0));
            if (sender == address(0)) {
                console2.log("Refusing to deploy without a signer.");
                console2.log("Local: DEPLOY_SENDER=<anvil account> forge script ... --broadcast --unlocked --sender <that account>");
                console2.log("Testnet: PRIVATE_KEY=<hex> and fund it.");
                console2.log("BSC testnet (chain 97) faucet: https://www.bnbchain.org/en/testnet-faucet");
                console2.log("New L1 devnet has no faucet. Bridge tBNB from BSC testnet.");
                revert("signer missing");
            }
            vm.startBroadcast(sender);
        }

        DemoAMM amm = new DemoAMM{value: bnbLiquidity}(tokenLiquidity);
        PublicRehearsal rehearsal = new PublicRehearsal(amm);
        vm.stopBroadcast();

        console2.log("DemoAMM", address(amm));
        console2.log("DemoToken", address(amm.token()));
        console2.log("PublicRehearsal", address(rehearsal));
        console2.log("These contracts are a public rehearsal. They are not ShieldedPool.");
    }
}
