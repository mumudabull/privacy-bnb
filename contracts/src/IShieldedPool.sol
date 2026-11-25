// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IShieldedPool
/// @notice Selectors checked against New L1 devnet bytecode and successful eth_calls
///         on 25 Nov 2026. `registerPrivacyInfo` is present in the bytecode; this
///         repo has not submitted a registration. Argument order follows the
///         PrivacyInfo fields documented in the July 2026 forum post
///         (ownerNullifierKeyHash, noteSecretSeedHash, authDataCommitment, scheme, viewKeyPub).
/// @dev Calling `transact` or `privDeposit` from this repo does not make a transfer
///      private. Proof bytes have to come from `newl1-shield`, which is not published.
interface IShieldedPool {
    function merkleRoot() external view returns (uint256);
    function pendingCount() external view returns (uint256);
    function pendingHead() external view returns (uint256);
    function depositPaused() external view returns (bool);
    function totalShielded() external view returns (uint256);
    function nullifierSpent(uint256 nullifier) external view returns (bool);

    function getPrivacyInfo(address account)
        external
        view
        returns (
            uint256 ownerNullifierKeyHash,
            uint256 noteSecretSeedHash,
            uint256 authDataCommitment,
            uint8 scheme,
            bytes32 viewKeyPub
        );

    function privDeposit(uint256 ownerCommitment, uint8 scheme, uint256 tokenField, bytes calldata outputNoteData)
        external
        payable;

    function deferBatchInsert(uint256 limit) external;

    function transact(
        bytes calldata poolProof,
        bytes calldata authProof,
        uint256[30] calldata pubSignals,
        bytes[3] calldata outputNoteData,
        bytes calldata callData
    ) external;

    function registerPrivacyInfo(
        uint256 ownerNullifierKeyHash,
        uint256 noteSecretSeedHash,
        uint256 authDataCommitment,
        uint8 scheme,
        bytes32 viewKeyPub
    ) external;
}
