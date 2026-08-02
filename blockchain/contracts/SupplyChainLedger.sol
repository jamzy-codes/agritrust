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

    address public immutable regulator;
    IProduceRegistry public produceRegistry;

    mapping (address => bool) public approvedDistrubtors;

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
    event DistributorAdded(address distributor);
    event DistributorRemoved(address distributor);

     modifier onlyRegulator() {
         require(msg.sender == regulator, "Not a Regulator");
         _;
     }

     modifier onlyDistrubutor(){
        require(approvedDistributors[msg.sender] , "Not an approved distributor");
        _;
     }

    constructor(address _produceRegistry , address _regulator) {
        produceRegistry = IProduceRegistry(_produceRegistry);
        regulator = _regulator;
    }

    function addDistributor(address distributor) external onlyRegulator{
        approvedDistributors[distributor] = true;
        emit DistributorAdded(distributor);
    }


   function removeDistrubutor(address distributor) external onlyRegulator {
      approvedDistributors[distributor] = false;
      emit DistributorRemoved(distrbutor);
   }
   
  function isApprovedDistributor(address wallet) exernal view returns (bool){
     return approvedDistributor[wallet];
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