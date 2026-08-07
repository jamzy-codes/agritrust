// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract ProduceRegistry {
    enum BatchStatus {
        REGISTERED,
        INSPECTED,
        IN_TRANSIT,
        DELIVERED,
        FLAGGED
    }

    struct Batch {
        string batchId;
        string farmId;
        string cropType;
        uint256 quantityKg;
        string seedVariety;
        bool isGMOFree;
        uint256 registeredAt;
        BatchStatus status;
        address registeredBy;
    }

    address public immutable owner;

    address public complianceRegistry;
    address public supplyChainLedger;

    mapping(string => Batch) private batches;
    mapping(string => bool) private batchExists;
    mapping(string => string[]) private farmBatches;
    address[] private regulators;
    mapping(address => bool) private isRegulator;

    event BatchRegistered(
        string batchId,
        string farmId,
        address indexed registeredBy,
        uint256 registeredAt
    );
    event BatchStatusChanged(string batchId, BatchStatus newStatus);
    event BatchFlagged(string batchId, string reason);
    event ComplianceRegistryUpdated(address indexed newRegistry);
    event SupplyChainLedgerUpdated(address indexed newLedger);
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyRegulator() {
        require(isRegulator[msg.sender], "Not a regulator");
        _;
    }

    modifier onlySiblingContracts() {
        require(
            msg.sender == complianceRegistry || msg.sender == supplyChainLedger,
            "Caller is not an authorized contract"
        );
        _;
    }

    constructor() {
    owner = msg.sender;
}

    // --- Setup functions (called once after all three contracts are deployed) ---

    function setComplianceRegistry(
        address newComplianceRegistry
    ) external onlyOwner {
        require(
            newComplianceRegistry != address(0),
            "Zero address not allowed"
        );
        complianceRegistry = newComplianceRegistry;
        emit ComplianceRegistryUpdated(newComplianceRegistry);
    }

    function setSupplyChainLedger(
        address newSupplyChainLedger
    ) external onlyOwner {
        require(newSupplyChainLedger != address(0), "Zero address not allowed");
        supplyChainLedger = newSupplyChainLedger;
        emit SupplyChainLedgerUpdated(newSupplyChainLedger);
    }

    function addRegulator(address account) external onlyOwner {
        isRegulator[account] = true;
        regulators.push(account);
    }

    function registerBatch(
        string calldata batchId,
        string calldata cropType,
        uint256 quantityKg,
        string calldata seedVariety,
        bool isGMOFree,
        string calldata farmId
    ) external {
    require(!batchExists[batchId], "Batch already exists");

        batches[batchId] = Batch({
            batchId: batchId,
            farmId: farmId,
            cropType: cropType,
            quantityKg: quantityKg,
            seedVariety: seedVariety,
            isGMOFree: isGMOFree,
            registeredAt: block.timestamp,
            status: BatchStatus.REGISTERED,
            registeredBy: msg.sender
        });

        batchExists[batchId] = true;
        farmBatches[farmId].push(batchId);

        emit BatchRegistered(batchId, farmId, msg.sender, block.timestamp);
    }

    function getBatch(
        string calldata batchId
    ) external view returns (Batch memory) {
        require(batchExists[batchId], "Batch not found");
        return batches[batchId];
    }

    function getBatchesByFarm(
        string calldata farmId
    ) external view returns (string[] memory) {
        return farmBatches[farmId];
    }

    function updateBatchStatus(
        string calldata batchId,
        BatchStatus newStatus
    ) external onlySiblingContracts {
        require(batchExists[batchId], "Batch not found");
        batches[batchId].status = newStatus;
        emit BatchStatusChanged(batchId, newStatus);
    }

    function flagBatch(
        string calldata batchId,
        string calldata reason
    ) external onlyRegulator {
        require(batchExists[batchId], "Batch not found");
        batches[batchId].status = BatchStatus.FLAGGED;
        emit BatchFlagged(batchId, reason);
        emit BatchStatusChanged(batchId, BatchStatus.FLAGGED);
    }
}
