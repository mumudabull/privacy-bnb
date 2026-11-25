// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DemoAMM} from "./DemoAMM.sol";

/// @title PublicRehearsal
/// @notice Public stand-in for shield -> atomicCall swap -> reshield.
/// @dev Every owner, amount, asset, and commitment is stored in the clear.
///      This contract does not verify a PLONK proof, does not submit a type
///      0x77 transaction, and is not the New L1 ShieldedPool at 0x…5000.
///      New L1 can reshield native BNB only. The rNOTE note created by
///      `atomicSwap` is a labeled stand-in so the three-step shape can run
///      without the unpublished `newl1-shield` CLI. It is not private.
contract PublicRehearsal {
    enum Asset {
        Bnb,
        Token
    }

    struct Note {
        address owner;
        Asset asset;
        uint256 amount;
        bool open;
        bool spent;
        bytes32 commitment;
    }

    DemoAMM public immutable amm;
    uint256 public nextId;
    mapping(uint256 id => Note) private _notes;

    event RehearsalShield(uint256 indexed id, address indexed owner, uint256 amount, bytes32 commitment);
    event RehearsalUnshield(uint256 indexed id, address indexed owner, uint256 amount);
    event RehearsalSwap(uint256 indexed bnbNoteId, uint256 amountIn, uint256 tokensOut);
    event RehearsalReshield(
        uint256 indexed id, address indexed owner, Asset asset, uint256 amount, bool open, bytes32 commitment
    );
    event RehearsalWithdrawToken(uint256 indexed id, address indexed owner, uint256 amount);

    error ZeroAmount();
    error UnknownNote(uint256 id);
    error NotOwner();
    error AlreadySpent(uint256 id);
    error WrongAsset();

    constructor(DemoAMM amm_) {
        amm = amm_;
    }

    function notes(uint256 id)
        external
        view
        returns (address owner, Asset asset, uint256 amount, bool open, bool spent, bytes32 commitment)
    {
        Note storage note = _notes[id];
        return (note.owner, note.asset, note.amount, note.open, note.spent, note.commitment);
    }

    /// @notice Public deposit. Stands in for `privDeposit`, which is itself a public entry on New L1.
    function shield() external payable returns (uint256 id) {
        if (msg.value == 0) revert ZeroAmount();
        id = _create(msg.sender, Asset.Bnb, msg.value, false);
        emit RehearsalShield(id, msg.sender, msg.value, _notes[id].commitment);
    }

    /// @notice Spend a BNB note, swap through the demo AMM, and record the rNOTE output as an open note.
    ///         The open flag matches the protocol's public-amount note. Here the owner is public too.
    function atomicSwap(uint256 id, uint256 minTokens) external returns (uint256 tokenNoteId, uint256 tokensOut) {
        Note storage note = _spendBnb(id);
        uint256 amountIn = note.amount;
        emit RehearsalUnshield(id, msg.sender, amountIn);

        tokensOut = amm.swapExactBnbForToken{value: amountIn}(minTokens);
        emit RehearsalSwap(id, amountIn, tokensOut);

        tokenNoteId = _create(msg.sender, Asset.Token, tokensOut, true);
        emit RehearsalReshield(
            tokenNoteId, msg.sender, Asset.Token, tokensOut, true, _notes[tokenNoteId].commitment
        );
    }

    /// @notice Native reshield the real pool can perform: lock BNB as an open note. Still public here.
    function reshieldBnb() external payable returns (uint256 id) {
        if (msg.value == 0) revert ZeroAmount();
        id = _create(msg.sender, Asset.Bnb, msg.value, true);
        emit RehearsalReshield(id, msg.sender, Asset.Bnb, msg.value, true, _notes[id].commitment);
    }

    /// @notice Public exit for a rehearsal token note. Real pool withdrawals reveal amount and recipient.
    function withdrawToken(uint256 id) external returns (uint256 amount) {
        Note storage note = _notes[id];
        if (note.owner == address(0)) revert UnknownNote(id);
        if (note.owner != msg.sender) revert NotOwner();
        if (note.spent) revert AlreadySpent(id);
        if (note.asset != Asset.Token) revert WrongAsset();
        note.spent = true;
        amount = note.amount;
        amm.token().transfer(msg.sender, amount);
        emit RehearsalWithdrawToken(id, msg.sender, amount);
    }

    function _spendBnb(uint256 id) internal returns (Note storage note) {
        note = _notes[id];
        if (note.owner == address(0)) revert UnknownNote(id);
        if (note.owner != msg.sender) revert NotOwner();
        if (note.spent) revert AlreadySpent(id);
        if (note.asset != Asset.Bnb) revert WrongAsset();
        if (note.amount == 0) revert ZeroAmount();
        note.spent = true;
    }

    function _create(address owner, Asset asset, uint256 amount, bool open) internal returns (uint256 id) {
        id = nextId;
        nextId = id + 1;
        bytes32 commitment = keccak256(abi.encode("darkswap.rehearsal.v1", id, owner, asset, amount, open));
        _notes[id] = Note({
            owner: owner,
            asset: asset,
            amount: amount,
            open: open,
            spent: false,
            commitment: commitment
        });
    }
}
