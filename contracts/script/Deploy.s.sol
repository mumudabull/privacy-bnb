// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {DemoAMM} from "../src/DemoAMM.sol";
import {IAggregatorV3} from "../src/IAggregatorV3.sol";
import {MockAggregator} from "../src/MockAggregator.sol";
import {PublicRehearsal} from "../src/PublicRehearsal.sol";

/// @notice Deploys the public rehearsal. Refuses to invent a key.
///         Local anvil: set DEPLOY_SENDER to an unlocked account and pass --unlocked.
///         BSC testnet or New L1 devnet: set PRIVATE_KEY and fund that address.
contract Deploy is Script {
    /// @dev Atlas SingleFeed BNB/USD on BSC testnet. Confirmed by the Atlas team. 18 decimals.
    address internal constant ATLAS_BNB_USD_BSC_TESTNET = 0x3957d289ee9C38272377786787ea34F9dd29788D;

    function run() external {
        uint256 bnbLiquidity = vm.envOr("AMM_BNB_LIQUIDITY", uint256(10 ether));
        uint256 rnotePerBnb = vm.envOr("DEMO_RNOTE_PER_BNB", uint256(555));
        uint256 tokenLiquidity = vm.envOr("AMM_TOKEN_LIQUIDITY", bnbLiquidity * rnotePerBnb / 1 ether);
        address oracle = vm.envOr("ORACLE_FEED", address(0));
        uint16 maxDeviationBps = uint16(vm.envOr("MAX_DEVIATION_BPS", uint256(500)));
        uint32 maxStaleSeconds = uint32(vm.envOr("MAX_STALE_SECONDS", uint256(3600)));
        if (oracle == address(0) && block.chainid == 97) {
            oracle = ATLAS_BNB_USD_BSC_TESTNET;
            console2.log("ORACLE_FEED default, Atlas BNB/USD on BSC testnet, confirmed by the Atlas team, read on chain");
            console2.log(oracle);
        }
        bool deployMock = oracle == address(0) && block.chainid == 31337;
        if (oracle == address(0) && !deployMock) {
            console2.log("Refusing to deploy. ORACLE_FEED is unset and this chain has no default feed.");
            console2.log("BSC testnet (chain 97) defaults to the Atlas BNB/USD feed.");
            console2.log("Chain 31337 deploys a MockAggregator at the pool spot instead. That mock is not an Atlas feed.");
            revert("ORACLE_FEED missing");
        }
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
        if (deployMock) {
            uint256 spot = tokenLiquidity * 1e18 / bnbLiquidity;
            MockAggregator mock = new MockAggregator(18);
            mock.setAnswer(int256(spot));
            oracle = address(mock);
            console2.log("MockAggregator (not an Atlas feed)", oracle);
            console2.log("mock spot 1e18", spot);
        }
        PublicRehearsal rehearsal =
            new PublicRehearsal(amm, IAggregatorV3(oracle), maxDeviationBps, maxStaleSeconds);
        vm.stopBroadcast();

        console2.log("DemoAMM", address(amm));
        console2.log("DemoToken", address(amm.token()));
        console2.log("PublicRehearsal", address(rehearsal));
        console2.log("These contracts are a public rehearsal. They are not ShieldedPool.");
    }
}
