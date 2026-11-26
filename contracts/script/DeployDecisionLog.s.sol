// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {DecisionLog} from "../src/DecisionLog.sol";

/// @notice Deploys DecisionLog. Does not record a decision and does not swap.
///         Set DECISION_LOG_AGENT to the address that may call `record`.
///         The signer becomes the owner and can change that authorization later.
///         Local anvil: DEPLOY_SENDER plus --unlocked. Testnet: PRIVATE_KEY.
///         This script is not run from the repository. Run it from a funded local wallet.
contract DeployDecisionLog is Script {
    function run() external {
        address agent = vm.envOr("DECISION_LOG_AGENT", address(0));
        if (agent == address(0)) {
            console2.log("Refusing to deploy. Set DECISION_LOG_AGENT to the recorder address.");
            revert("DECISION_LOG_AGENT missing");
        }

        uint256 key = vm.envOr("PRIVATE_KEY", uint256(0));
        if (key != 0) {
            vm.startBroadcast(key);
        } else {
            address sender = vm.envOr("DEPLOY_SENDER", address(0));
            if (sender == address(0)) {
                console2.log("Refusing to deploy without a signer.");
                console2.log(
                    "Local: DEPLOY_SENDER=<anvil account> forge script ... --broadcast --unlocked --sender <that account>"
                );
                console2.log("Testnet: PRIVATE_KEY=<hex> and fund it.");
                revert("signer missing");
            }
            vm.startBroadcast(sender);
        }

        DecisionLog decisionLog = new DecisionLog(agent);
        vm.stopBroadcast();

        console2.log("DecisionLog", address(decisionLog));
        console2.log("owner", decisionLog.owner());
        console2.log("agent", agent);
        console2.log("DecisionLog only stores decisions. It is not the rehearsal and it is not ShieldedPool.");
    }
}
