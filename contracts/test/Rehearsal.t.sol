// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DemoAMM} from "../src/DemoAMM.sol";
import {IShieldedPool} from "../src/IShieldedPool.sol";
import {PublicRehearsal} from "../src/PublicRehearsal.sol";
import {SwapMath} from "../src/SwapMath.sol";

contract RehearsalTest is Test {
    uint256 internal constant BNB_LIQ = 10 ether;
    uint256 internal constant TOKEN_LIQ = 10_000 ether;
    /// @dev quote(0.1 ether, 10 ether, 10_000 ether) with a 30 bps fee.
    uint256 internal constant QUOTE_POINT_ONE = 98_715803439706129885;

    DemoAMM internal amm;
    PublicRehearsal internal rehearsal;
    address internal alice = makeAddr("alice");

    function setUp() public {
        amm = new DemoAMM{value: BNB_LIQ}(TOKEN_LIQ);
        rehearsal = new PublicRehearsal(amm);
        vm.deal(alice, 1 ether);
    }

    function test_quoteMatchesKnownVector() public view {
        assertEq(SwapMath.quote(0.1 ether, BNB_LIQ, TOKEN_LIQ), QUOTE_POINT_ONE);
        assertEq(amm.quoteBnbToToken(0.1 ether), QUOTE_POINT_ONE);
    }

    function test_shieldAtomicSwapReshieldAndWithdraw() public {
        vm.startPrank(alice);
        uint256 bnbNote = rehearsal.shield{value: 0.1 ether}();
        (uint256 tokenNote, uint256 tokensOut) = rehearsal.atomicSwap(bnbNote, QUOTE_POINT_ONE);
        vm.stopPrank();

        assertEq(tokensOut, QUOTE_POINT_ONE);
        assertEq(address(rehearsal).balance, 0);
        assertEq(amm.token().balanceOf(address(rehearsal)), tokensOut);
        assertEq(amm.reserveBnb(), BNB_LIQ + 0.1 ether);
        assertEq(amm.reserveToken(), TOKEN_LIQ - tokensOut);

        (address owner,, uint256 amount, bool open, bool spent, bytes32 commitment) = rehearsal.notes(tokenNote);
        assertEq(owner, alice);
        assertEq(amount, tokensOut);
        assertTrue(open);
        assertFalse(spent);
        assertTrue(commitment != bytes32(0));

        (,, uint256 shieldedAmount,, bool bnbSpent,) = rehearsal.notes(bnbNote);
        assertEq(shieldedAmount, 0.1 ether);
        assertTrue(bnbSpent);

        vm.prank(alice);
        rehearsal.withdrawToken(tokenNote);
        assertEq(amm.token().balanceOf(alice), tokensOut);
        assertEq(amm.token().balanceOf(address(rehearsal)), 0);
    }

    function test_nativeReshieldKeepsBnb() public {
        vm.prank(alice);
        uint256 id = rehearsal.reshieldBnb{value: 0.2 ether}();
        (address owner, PublicRehearsal.Asset asset, uint256 amount, bool open,,) = rehearsal.notes(id);
        assertEq(owner, alice);
        assertEq(uint256(asset), uint256(PublicRehearsal.Asset.Bnb));
        assertEq(amount, 0.2 ether);
        assertTrue(open);
        assertEq(address(rehearsal).balance, 0.2 ether);
    }

    function test_revertDoubleSpendAndStranger() public {
        vm.prank(alice);
        uint256 id = rehearsal.shield{value: 0.05 ether}();

        vm.prank(alice);
        rehearsal.atomicSwap(id, 0);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PublicRehearsal.AlreadySpent.selector, id));
        rehearsal.atomicSwap(id, 0);

        vm.prank(alice);
        uint256 other = rehearsal.shield{value: 0.05 ether}();
        vm.expectRevert(PublicRehearsal.NotOwner.selector);
        rehearsal.atomicSwap(other, 0);
    }

    function test_revertSlippage() public {
        vm.prank(alice);
        uint256 id = rehearsal.shield{value: 0.1 ether}();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DemoAMM.Slippage.selector, QUOTE_POINT_ONE, QUOTE_POINT_ONE + 1));
        rehearsal.atomicSwap(id, QUOTE_POINT_ONE + 1);
    }

    function test_shieldedPoolSelectorsMatchDevnet() public pure {
        assertEq(IShieldedPool.merkleRoot.selector, bytes4(hex"2eb4a7ab"));
        assertEq(IShieldedPool.pendingCount.selector, bytes4(hex"ea70b4af"));
        assertEq(IShieldedPool.pendingHead.selector, bytes4(hex"5a0bc37c"));
        assertEq(IShieldedPool.depositPaused.selector, bytes4(hex"02befd24"));
        assertEq(IShieldedPool.totalShielded.selector, bytes4(hex"516b9ff0"));
        assertEq(IShieldedPool.nullifierSpent.selector, bytes4(hex"69aa8088"));
        assertEq(IShieldedPool.getPrivacyInfo.selector, bytes4(hex"a43d225a"));
        assertEq(IShieldedPool.privDeposit.selector, bytes4(hex"9e354d31"));
        assertEq(IShieldedPool.deferBatchInsert.selector, bytes4(hex"a63cf420"));
        assertEq(IShieldedPool.transact.selector, bytes4(hex"77ed2696"));
        assertEq(IShieldedPool.registerPrivacyInfo.selector, bytes4(hex"88eb4659"));
    }
}
