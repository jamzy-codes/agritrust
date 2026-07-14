import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AgriTrustModule", (m) => {
  // 1. Deploy ProduceRegistry first — it has no dependencies
  const produceRegistry = m.contract("ProduceRegistry", []);

  // 2. Deploy ComplianceRegistry and SupplyChainLedger, passing in ProduceRegistry's address
  const complianceRegistry = m.contract("ComplianceRegistry", [produceRegistry]);
  const supplyChainLedger = m.contract("SupplyChainLedger", [produceRegistry]);

  // 3. Wire ProduceRegistry so it knows which two contracts are allowed
  //    to call updateBatchStatus()
  m.call(produceRegistry, "setComplianceRegistry", [complianceRegistry]);
  m.call(produceRegistry, "setSupplyChainLedger", [supplyChainLedger]);

  return { produceRegistry, complianceRegistry, supplyChainLedger };
});