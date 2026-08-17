import { produceRegistryAbi } from "./abis/ProduceRegistry";
import { complianceRegistryAbi } from "./abis/ComplianceRegistry";
import { supplyChainLedgerAbi } from "./abis/SupplyChainLedger";

export { produceRegistryAbi } from "./abis/ProduceRegistry";
export { complianceRegistryAbi } from "./abis/ComplianceRegistry";
export { supplyChainLedgerAbi } from "./abis/SupplyChainLedger";

export const PRODUCE_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_PRODUCE_REGISTRY_CONTRACT_ADDRESS as `0x${string}`;
export const COMPLIANCE_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_COMPLIANCE_REGISTRY_CONTRACT_ADDRESS as `0x${string}`;
export const SUPPLY_CHAIN_LEDGER_ADDRESS = process.env.NEXT_PUBLIC_SUPPLY_CHAIN_LEDGER_CONTRACT_ADDRESS as `0x${string}`;

export const produceRegistryContract = {
  address: PRODUCE_REGISTRY_ADDRESS,
  abi: produceRegistryAbi,
} as const;

export const complianceRegistryContract = {
  address: COMPLIANCE_REGISTRY_ADDRESS,
  abi: complianceRegistryAbi,
} as const;

export const supplyChainLedgerContract = {
  address: SUPPLY_CHAIN_LEDGER_ADDRESS,
  abi: supplyChainLedgerAbi,
} as const;
