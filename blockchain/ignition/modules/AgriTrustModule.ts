import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AgriTrustModule", (m) => {
  // Regulator address — defaults to Hardhat Account #0 for local testing.
  // For Amoy, override via --parameters with the PRIVATE_KEY wallet's address.
  const regulator = m.getParameter(
    "regulatorAddress",
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );

  // 1. Deploy ProduceRegistry first — it has no dependencies
  const produceRegistry = m.contract("ProduceRegistry", []);

  // 2. Deploy ComplianceRegistry and SupplyChainLedger, passing in
  //    ProduceRegistry's address and the regulator address
  const complianceRegistry = m.contract("ComplianceRegistry", [
    produceRegistry,
    regulator,
  ]);
  const supplyChainLedger = m.contract("SupplyChainLedger", [
    produceRegistry,
    regulator,
  ]);

  // 3. Wire ProduceRegistry so it knows which two contracts are allowed
  //    to call updateBatchStatus()
  m.call(produceRegistry, "setComplianceRegistry", [complianceRegistry]);
  m.call(produceRegistry, "setSupplyChainLedger", [supplyChainLedger]);

  return { produceRegistry, complianceRegistry, supplyChainLedger };
});