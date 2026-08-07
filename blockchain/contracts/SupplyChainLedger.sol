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

    function updateBatchStatus(
        string calldata batchId,
        BatchStatus newStatus
    ) external;
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

    address public immutable regulator;
    IProduceRegistry public immutable produceRegistry;

    mapping(address => bool) public approvedDistributors;
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
    event DistributorAdded(address indexed distributor);
    event DistributorRemoved(address indexed distributor);

    modifier onlyRegulator() {
        require(msg.sender == regulator, "Not a Regulator");
        _;
    }

    modifier onlyDistributor() {
        require(
            approvedDistributors[msg.sender],
            "Not an approved distributor"
        );
        _;
    }

    constructor(address _produceRegistry, address _regulator) {
        require(_regulator != address(0), "Zero address not allowed");
        produceRegistry = IProduceRegistry(_produceRegistry);
        regulator = _regulator;
    }

    function addDistributor(address distributor) external onlyRegulator {
        approvedDistributors[distributor] = true;
        emit DistributorAdded(distributor);
    }

    function removeDistributor(address distributor) external onlyRegulator {
        approvedDistributors[distributor] = false;
        emit DistributorRemoved(distributor);
    }

    function isApprovedDistributor(
        address wallet
    ) external view returns (bool) {
        return approvedDistributors[wallet];
    }

    function recordHandoff(
        string calldata batchId,
        string calldata fromParty,
        string calldata toParty,
        string calldata location,
        string calldata condition,
        string calldata transportMethod,
        uint256 quantityKg
    ) external onlyDistributor {
        address fromWallet = batchStarted[batchId]
            ? currentCustodian[batchId]
            : msg.sender;

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

        produceRegistry.updateBatchStatus(
            batchId,
            IProduceRegistry.BatchStatus.IN_TRANSIT
        );
    }

    function recordDelivery(
        string calldata batchId,
        string calldata location
    ) external onlyDistributor {
        emit BatchDelivered(batchId, location, block.timestamp);
        produceRegistry.updateBatchStatus(
            batchId,
            IProduceRegistry.BatchStatus.DELIVERED
        );
    }

    function getHandoffHistory(
        string calldata batchId
    ) external view returns (Handoff[] memory) {
        return handoffHistory[batchId];
    }

    function getCurrentCustodian(
        string calldata batchId
    ) external view returns (address) {
        return currentCustodian[batchId];
    }
}
