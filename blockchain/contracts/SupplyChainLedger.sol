// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IProduceRegistry {
    enum BatchStatus {
        REGISTERED,
        INSPECTED,
        IN_TRANSIT,
        DELIVERED,
        FLAGGED
    }

    function updateBatchStatus(string calldata batchId, BatchStatus newStatus) external;
}

contract SupplyChainLedger {
    struct Handoff {
        string batchId;
        string fromParty;
        string toParty;
        address fromWallet;
        address toWallet;
        string location;
        string conditionOnHandoff;
        string transportMethod;
        uint256 quantityKg;
        uint256 timestamp;
    }

    address public owner;
    IProduceRegistry public produceRegistry;

    mapping(string => Handoff[]) private handoffHistory;
    mapping(string => address) private currentCustodian;
    mapping(string => bool) private batchStarted;

    event HandoffRecorded(
        string batchId,
        string fromParty,
        string toParty,
        uint256 timestamp
    );
    event BatchDelivered(string batchId, string location, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    constructor(address _produceRegistry) {
        owner = msg.sender;
        produceRegistry = IProduceRegistry(_produceRegistry);
    }

    function recordHandoff(
        string calldata batchId,
        string calldata fromParty,
        string calldata toParty,
        string calldata location,
        string calldata condition,
        string calldata transportMethod,
        uint256 quantityKg
    ) external {
        address fromWallet = batchStarted[batchId] ? currentCustodian[batchId] : msg.sender;

        handoffHistory[batchId].push(
            Handoff({
                batchId: batchId,
                fromParty: fromParty,
                toParty: toParty,
                fromWallet: fromWallet,
                toWallet: msg.sender,
                location: location,
                conditionOnHandoff: condition,
                transportMethod: transportMethod,
                quantityKg: quantityKg,
                timestamp: block.timestamp
            })
        );

        currentCustodian[batchId] = msg.sender;
        batchStarted[batchId] = true;

        emit HandoffRecorded(batchId, fromParty, toParty, block.timestamp);

        produceRegistry.updateBatchStatus(batchId, IProduceRegistry.BatchStatus.IN_TRANSIT);
    }

    function recordDelivery(string calldata batchId, string calldata location) external {
        emit BatchDelivered(batchId, location, block.timestamp);

        produceRegistry.updateBatchStatus(batchId, IProduceRegistry.BatchStatus.DELIVERED);
    }

    function getHandoffHistory(string calldata batchId) external view returns (Handoff[] memory) {
        return handoffHistory[batchId];
    }

    function getCurrentCustodian(string calldata batchId) external view returns (address) {
        return currentCustodian[batchId];
    }
}