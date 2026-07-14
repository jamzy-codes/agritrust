import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import type {
  ProduceRegistry,
  ComplianceRegistry,
  SupplyChainLedger,
} from "../typechain-types";

function loadDeployedAddresses(): Record<string, string> {
  const chainId = network.config.chainId;
  const filePath = path.join(
    __dirname,
    "..",
    "ignition",
    "deployments",
    `chain-${chainId}`,
    "deployed_addresses.json"
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Could not find deployed_addresses.json at ${filePath}. Have you run the Ignition deploy for this network yet?`
    );
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// Small helper so the output is easy to scan in the terminal
function section(title: string) {
  console.log("");
  console.log(`--- ${title} ---`);
}

async function main() {
  const addresses = loadDeployedAddresses();

  const produceRegistryAddress = addresses["AgriTrustModule#ProduceRegistry"];
  const complianceRegistryAddress = addresses["AgriTrustModule#ComplianceRegistry"];
  const supplyChainLedgerAddress = addresses["AgriTrustModule#SupplyChainLedger"];

  if (!produceRegistryAddress || !complianceRegistryAddress || !supplyChainLedgerAddress) {
    throw new Error("Missing one or more contract addresses in deployed_addresses.json");
  }

  const signers = await ethers.getSigners();
  const deployer = signers[0]; // acts as the farmer registering the batch
  const inspector = signers[1] ?? deployer; // acts as the inspector
  const distributor = signers[3] ?? deployer; // acts as the logistics/distributor party

  const produceRegistry = (await ethers.getContractAt(
    "ProduceRegistry",
    produceRegistryAddress
  )) as unknown as ProduceRegistry;

  const complianceRegistry = (await ethers.getContractAt(
    "ComplianceRegistry",
    complianceRegistryAddress
  )) as unknown as ComplianceRegistry;

  const supplyChainLedger = (await ethers.getContractAt(
    "SupplyChainLedger",
    supplyChainLedgerAddress
  )) as unknown as SupplyChainLedger;

  const batchId = "AGT-0042";
  const farmId = "FARM-KWR-001";

  // --- Step 1: Register the batch ---
  section("Step 1: Register Batch");
  const txRegister = await produceRegistry
    .connect(deployer)
    .registerBatch(
      batchId,
      "Maize",
      500, // quantityKg
      "SAMMAZ-15",
      true, // isGMOFree
      farmId
    );
  await txRegister.wait();
  console.log(`✔ Batch ${batchId} registered by ${deployer.address}`);

  let batch = await produceRegistry.getBatch(batchId);
  console.log(`  Status after registration: ${batch.status} (0 = REGISTERED)`);

  // --- Step 2: Record inspection ---
  section("Step 2: Record Inspection");
  const txInspect = await complianceRegistry
    .connect(inspector)
    .recordInspection(
      batchId,
      "INSP-001",
      495, // physical weight after inspection
      "Grade A",
      1, // GMOStatus.NON_GMO
      "Biosafety Level 1",
      true, // meetsNAFDACStandards
      "Passed all quality checks"
    );
  await txInspect.wait();
  console.log(`✔ Inspection recorded by ${inspector.address}`);

  batch = await produceRegistry.getBatch(batchId);
  console.log(`  Status after inspection: ${batch.status} (1 = INSPECTED)`);

  // --- Step 3: Issue certificate ---
  section("Step 3: Issue Certificate");
  const now = Math.floor(Date.now() / 1000);
  const oneYear = 365 * 24 * 60 * 60;
  const txCertify = await complianceRegistry
    .connect(inspector)
    .issueCertificate(batchId, "CERT-AGT-0042", now, now + oneYear);
  await txCertify.wait();
  console.log(`✔ Certificate issued for ${batchId}`);

  const certificate = await complianceRegistry.getCertificate(batchId);
  console.log(`  Certificate ID: ${certificate.certId}`);
  console.log(`  Grade: ${certificate.grade}`);
  console.log(`  Active: ${certificate.isActive}`);

  // --- Step 4: Record handoff (farm -> distributor) ---
  section("Step 4: Record Handoff");
  const txHandoff = await supplyChainLedger
    .connect(distributor)
    .recordHandoff(
      batchId,
      "Farm Gate - Kwara",
      "AgriTrust Logistics Ltd",
      "Ilorin Distribution Hub",
      "Good condition, properly packaged",
      "Refrigerated Truck",
      495
    );
  await txHandoff.wait();
  console.log(`✔ Handoff recorded, custody moved to ${distributor.address}`);

  batch = await produceRegistry.getBatch(batchId);
  console.log(`  Status after handoff: ${batch.status} (2 = IN_TRANSIT)`);

  // --- Step 5: Record delivery ---
  section("Step 5: Record Delivery");
  const txDeliver = await supplyChainLedger
    .connect(distributor)
    .recordDelivery(batchId, "Lagos Central Market");
  await txDeliver.wait();
  console.log(`✔ Delivery recorded`);

  batch = await produceRegistry.getBatch(batchId);
  console.log(`  Status after delivery: ${batch.status} (3 = DELIVERED)`);

  // --- Final summary ---
  section("Final Batch State");
  console.log(batch);

  const history = await supplyChainLedger.getHandoffHistory(batchId);
  section("Handoff History");
  console.log(history);

  console.log("");
  console.log("✅ Full AGT-0042 demo flow completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});