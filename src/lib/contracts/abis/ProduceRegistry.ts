export const produceRegistryAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "batchId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "BatchFlagged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "batchId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "farmId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "registeredBy",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "registeredAt",
        "type": "uint256"
      }
    ],
    "name": "BatchRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "batchId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "enum ProduceRegistry.BatchStatus",
        "name": "newStatus",
        "type": "uint8"
      }
    ],
    "name": "BatchStatusChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "newRegistry",
        "type": "address"
      }
    ],
    "name": "ComplianceRegistryUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "newLedger",
        "type": "address"
      }
    ],
    "name": "SupplyChainLedgerUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "addRegulator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "complianceRegistry",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "batchId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "flagBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "batchId",
        "type": "string"
      }
    ],
    "name": "getBatch",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "batchId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "farmId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "cropType",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "quantityKg",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "seedVariety",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isGMOFree",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "registeredAt",
            "type": "uint256"
          },
          {
            "internalType": "enum ProduceRegistry.BatchStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "registeredBy",
            "type": "address"
          }
        ],
        "internalType": "struct ProduceRegistry.Batch",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "farmId",
        "type": "string"
      }
    ],
    "name": "getBatchesByFarm",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "batchId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "cropType",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "quantityKg",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "seedVariety",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "isGMOFree",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "farmId",
        "type": "string"
      }
    ],
    "name": "registerBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newComplianceRegistry",
        "type": "address"
      }
    ],
    "name": "setComplianceRegistry",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newSupplyChainLedger",
        "type": "address"
      }
    ],
    "name": "setSupplyChainLedger",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "supplyChainLedger",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "batchId",
        "type": "string"
      },
      {
        "internalType": "enum ProduceRegistry.BatchStatus",
        "name": "newStatus",
        "type": "uint8"
      }
    ],
    "name": "updateBatchStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
