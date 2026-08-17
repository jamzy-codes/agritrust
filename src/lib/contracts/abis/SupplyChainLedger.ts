export const supplyChainLedgerAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_produceRegistry",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_regulator",
        "type": "address"
      }
    ],
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
        "name": "location",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "BatchDelivered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "distributor",
        "type": "address"
      }
    ],
    "name": "DistributorAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "distributor",
        "type": "address"
      }
    ],
    "name": "DistributorRemoved",
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
        "name": "fromParty",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "toParty",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "HandoffRecorded",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "distributor",
        "type": "address"
      }
    ],
    "name": "addDistributor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "approvedDistributors",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
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
      }
    ],
    "name": "getCurrentCustodian",
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
      }
    ],
    "name": "getHandoffHistory",
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
            "name": "fromParty",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "toParty",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "fromWallet",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "toWallet",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "location",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "conditionOnHandoff",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "transportMethod",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "quantityKg",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct SupplyChainLedger.Handoff[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "isApprovedDistributor",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "produceRegistry",
    "outputs": [
      {
        "internalType": "contract IProduceRegistry",
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
        "name": "location",
        "type": "string"
      }
    ],
    "name": "recordDelivery",
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
      },
      {
        "internalType": "string",
        "name": "fromParty",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "toParty",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "condition",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "transportMethod",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "quantityKg",
        "type": "uint256"
      }
    ],
    "name": "recordHandoff",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "regulator",
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
        "internalType": "address",
        "name": "distributor",
        "type": "address"
      }
    ],
    "name": "removeDistributor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
