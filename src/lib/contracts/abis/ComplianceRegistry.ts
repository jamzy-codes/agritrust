export const complianceRegistryAbi = [
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
        "name": "certId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "batchId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "issuedBy",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "issuedAt",
        "type": "uint256"
      }
    ],
    "name": "CertificateIssued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "certId",
        "type": "string"
      },
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
    "name": "CertificateRevoked",
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
        "name": "inspectorId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "enum ComplianceRegistry.GMOStatus",
        "name": "gmoStatus",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "grade",
        "type": "string"
      }
    ],
    "name": "InspectionRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "inspector",
        "type": "address"
      }
    ],
    "name": "InspectorAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "inspector",
        "type": "address"
      }
    ],
    "name": "InspectorRemoved",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "inspector",
        "type": "address"
      }
    ],
    "name": "addInspector",
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
    "name": "approvedInspectors",
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
    "name": "getCertificate",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "certId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "batchId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "inspectorId",
            "type": "string"
          },
          {
            "internalType": "enum ComplianceRegistry.GMOStatus",
            "name": "gmoStatus",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "grade",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "issuedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "validUntil",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "issuedBy",
            "type": "address"
          }
        ],
        "internalType": "struct ComplianceRegistry.Certificate",
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
        "name": "batchId",
        "type": "string"
      }
    ],
    "name": "getInspection",
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
            "name": "inspectorId",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "physicalWeightKg",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "qualityGrade",
            "type": "string"
          },
          {
            "internalType": "enum ComplianceRegistry.GMOStatus",
            "name": "gmoStatus",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "biosafetyGrade",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "meetsNAFDACStandards",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "notes",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "inspectedAt",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "inspectedBy",
            "type": "address"
          }
        ],
        "internalType": "struct ComplianceRegistry.Inspection",
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
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "isApprovedInspector",
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
      },
      {
        "internalType": "string",
        "name": "certId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "validFrom",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "validUntil",
        "type": "uint256"
      }
    ],
    "name": "issueCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
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
        "name": "inspectorId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "weightKg",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "grade",
        "type": "string"
      },
      {
        "internalType": "enum ComplianceRegistry.GMOStatus",
        "name": "gmoStatus",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "biosafetyGrade",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "meetsNAFDAC",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "notes",
        "type": "string"
      }
    ],
    "name": "recordInspection",
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
        "name": "inspector",
        "type": "address"
      }
    ],
    "name": "removeInspector",
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
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "revokeCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
