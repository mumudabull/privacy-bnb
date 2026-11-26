// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title DecisionLog
/// @notice Append-only record of guarded-swap decisions written by an authorized agent.
/// @dev This contract does not read Atlas, call CoinMarketCap, price a pool, or move funds.
///      The agent supplies every field.
///
///      Units, for the site agent that wires this later:
///      - `atlasPrice` and `cmcPrice` are 18-decimal USD per BNB. That matches the Atlas
///        BNB/USD feed on BSC testnet (18 decimals) and the quote path's CoinMarketCap scaling.
///        Use 0 when that source was not read.
///      - `cmcResponseHash` is the sha256 of the raw CoinMarketCap response body, or bytes32(0)
///        when there was no body.
///      - `riskScore` is a uint8 the agent submits. This contract does not compute or bound it
///        beyond the type. The quote path does not produce a score yet.
///      - `gapBps` is an integer basis-point gap, not a percentage. The quote path
///        computes `abs(pool - reference) * 10000 / reference`.
///      - `amount` is wei of the amount the agent quoted or refused.
///      - `txRef` is the transaction hash of a broadcast, or bytes32(0) when the decision
///        did not broadcast.
///
///      Decision values are fixed:
///      0 pass, 1 block_gap, 2 block_stale, 3 block_cap, 4 quote_only.
contract DecisionLog {
    enum Decision {
        pass,
        block_gap,
        block_stale,
        block_cap,
        quote_only
    }

    struct Record {
        uint256 atlasPrice;
        uint256 cmcPrice;
        bytes32 cmcResponseHash;
        uint8 riskScore;
        uint256 gapBps;
        uint256 amount;
        Decision decision;
        bytes32 txRef;
        address agent;
    }

    address public owner;
    mapping(address agent => bool allowed) public agents;
    uint256 public count;
    mapping(uint256 id => Record) private _records;

    event AgentUpdated(address indexed agent, bool allowed);
    event DecisionRecorded(
        uint256 indexed id,
        address indexed agent,
        Decision indexed decision,
        uint256 atlasPrice,
        uint256 cmcPrice,
        bytes32 cmcResponseHash,
        uint8 riskScore,
        uint256 gapBps,
        uint256 amount,
        bytes32 txRef
    );

    error NotOwner();
    error NotAgent();
    error ZeroAddress();
    error UnknownRecord(uint256 id);

    /// @param agent Address allowed to record. The deployer is the owner and is not an agent
    ///        unless it is also this address.
    constructor(address agent) {
        if (agent == address(0)) revert ZeroAddress();
        owner = msg.sender;
        agents[agent] = true;
        emit AgentUpdated(agent, true);
    }

    /// @notice Owner sets or clears an agent. Address zero is rejected.
    function setAgent(address agent, bool allowed) external {
        if (msg.sender != owner) revert NotOwner();
        if (agent == address(0)) revert ZeroAddress();
        agents[agent] = allowed;
        emit AgentUpdated(agent, allowed);
    }

    /// @notice Append one decision. Returns the id, starting at 0.
    function record(
        uint256 atlasPrice,
        uint256 cmcPrice,
        bytes32 cmcResponseHash,
        uint8 riskScore,
        uint256 gapBps,
        uint256 amount,
        Decision decision,
        bytes32 txRef
    ) external returns (uint256 id) {
        if (!agents[msg.sender]) revert NotAgent();
        id = count;
        count = id + 1;
        _records[id] = Record({
            atlasPrice: atlasPrice,
            cmcPrice: cmcPrice,
            cmcResponseHash: cmcResponseHash,
            riskScore: riskScore,
            gapBps: gapBps,
            amount: amount,
            decision: decision,
            txRef: txRef,
            agent: msg.sender
        });
        emit DecisionRecorded(
            id, msg.sender, decision, atlasPrice, cmcPrice, cmcResponseHash, riskScore, gapBps, amount, txRef
        );
    }

    /// @notice A missing id reverts. A stored record always has a non-zero agent.
    function records(uint256 id) external view returns (Record memory) {
        Record memory item = _records[id];
        if (item.agent == address(0)) revert UnknownRecord(id);
        return item;
    }
}
