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