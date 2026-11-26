// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DecisionLog} from "../src/DecisionLog.sol";

contract DecisionLogTest is Test {
    DecisionLog internal decisionLog;
    address internal agent = makeAddr("agent");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        decisionLog = new DecisionLog(agent);
    }

    function test_ownerAndInitialAgent() public view {
        assertEq(decisionLog.owner(), address(this));
        assertTrue(decisionLog.agents(agent));
        assertFalse(decisionLog.agents(address(this)));
        assertEq(decisionLog.count(), 0);
    }

    function test_constructorRejectsZeroAgent() public {
        vm.expectRevert(DecisionLog.ZeroAddress.selector);
        new DecisionLog(address(0));
    }

    function test_enumOrdinalsStayFixed() public pure {
        assertEq(uint8(DecisionLog.Decision.pass), 0);
        assertEq(uint8(DecisionLog.Decision.block_gap), 1);
        assertEq(uint8(DecisionLog.Decision.block_stale), 2);
        assertEq(uint8(DecisionLog.Decision.block_cap), 3);
        assertEq(uint8(DecisionLog.Decision.quote_only), 4);
    }

    function test_onlyOwnerSetsAgent() public {
        address next = makeAddr("next");
        vm.prank(stranger);
        vm.expectRevert(DecisionLog.NotOwner.selector);
        decisionLog.setAgent(next, true);

        vm.expectRevert(DecisionLog.ZeroAddress.selector);
        decisionLog.setAgent(address(0), true);

        vm.expectEmit(true, false, false, true);
        emit DecisionLog.AgentUpdated(next, true);
        decisionLog.setAgent(next, true);
        assertTrue(decisionLog.agents(next));

        decisionLog.setAgent(agent, false);
        assertFalse(decisionLog.agents(agent));
    }

    function test_strangerAndOwnerCannotRecord() public {
        vm.prank(stranger);
        vm.expectRevert(DecisionLog.NotAgent.selector);
        decisionLog.record(1, 2, bytes32(uint256(3)), 4, 5, 6, DecisionLog.Decision.pass, bytes32(0));

        vm.expectRevert(DecisionLog.NotAgent.selector);
        decisionLog.record(1, 2, bytes32(uint256(3)), 4, 5, 6, DecisionLog.Decision.pass, bytes32(0));
    }

    function test_revokedAgentCannotRecord() public {
        decisionLog.setAgent(agent, false);
        vm.prank(agent);
        vm.expectRevert(DecisionLog.NotAgent.selector);
        decisionLog.record(1, 2, bytes32(uint256(3)), 4, 5, 6, DecisionLog.Decision.block_cap, bytes32(0));
    }

    function test_agentRecordsEveryFieldAndOptionalTxRef() public {
        bytes32 responseHash = keccak256("cmc-body");
        uint256 atlasPrice = 555 ether;
        uint256 cmcPrice = 0;
        uint8 riskScore = 255;
        uint256 gapBps = 70_000;
        uint256 amount = 0.04 ether;

        vm.expectEmit(true, true, true, true);
        emit DecisionLog.DecisionRecorded(
            0,
            agent,
            DecisionLog.Decision.quote_only,
            atlasPrice,
            cmcPrice,
            responseHash,
            riskScore,
            gapBps,
            amount,
            bytes32(0)
        );
        vm.prank(agent);
        uint256 id = decisionLog.record(
            atlasPrice, cmcPrice, responseHash, riskScore, gapBps, amount, DecisionLog.Decision.quote_only, bytes32(0)
        );

        assertEq(id, 0);
        assertEq(decisionLog.count(), 1);
        DecisionLog.Record memory stored = decisionLog.records(0);
        assertEq(stored.atlasPrice, atlasPrice);
        assertEq(stored.cmcPrice, 0);
        assertEq(stored.cmcResponseHash, responseHash);
        assertEq(stored.riskScore, 255);
        assertEq(stored.gapBps, 70_000);
        assertEq(stored.amount, amount);
        assertEq(uint8(stored.decision), uint8(DecisionLog.Decision.quote_only));
        assertEq(stored.txRef, bytes32(0));
        assertEq(stored.agent, agent);
    }

    function test_secondRecordKeepsTxRef() public {
        bytes32 txRef = keccak256("swap");
        vm.prank(agent);
        decisionLog.record(1, 1, bytes32(uint256(9)), 1, 41, 0.01 ether, DecisionLog.Decision.pass, txRef);
        vm.prank(agent);
        uint256 id = decisionLog.record(1, 1, bytes32(0), 0, 41, 0.1 ether, DecisionLog.Decision.block_gap, bytes32(0));

        assertEq(id, 1);
        assertEq(decisionLog.count(), 2);
        assertEq(decisionLog.records(0).txRef, txRef);
        assertEq(uint8(decisionLog.records(0).decision), uint8(DecisionLog.Decision.pass));
        assertEq(uint8(decisionLog.records(1).decision), uint8(DecisionLog.Decision.block_gap));
        assertEq(decisionLog.records(1).txRef, bytes32(0));
    }

    function test_missingRecordReverts() public {
        vm.expectRevert(abi.encodeWithSelector(DecisionLog.UnknownRecord.selector, 0));
        decisionLog.records(0);
    }

    function test_blockReasonsRoundTrip() public {
        DecisionLog.Decision[3] memory reasons =
            [DecisionLog.Decision.block_stale, DecisionLog.Decision.block_cap, DecisionLog.Decision.block_gap];
        for (uint256 i = 0; i < reasons.length; i++) {
            vm.prank(agent);
            decisionLog.record(0, 0, bytes32(0), 0, i, i, reasons[i], bytes32(uint256(i + 1)));
            assertEq(uint8(decisionLog.records(i).decision), uint8(reasons[i]));
        }
    }
}
