import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import type { ProduceRegistry, ComplianceRegistry } from "../typechain-types";

/**
 * Reads Ignition's deployed_addresses.json for the current network
 * so we don't have to hardcode contract addresses by hand each time.
 */
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

async function main() {
  const addresses = loadDeployedAddresses();

  const produceRegistryAddress = addresses["AgriTrustModule#ProduceRegistry"];
  const complianceRegistryAddress = addresses["AgriTrustModule#ComplianceRegistry"];

  if (!produceRegistryAddress || !complianceRegistryAddress) {
    throw new Error("Missing expected contract addresses in deployed_addresses.json");
  }

  console.log("Using deployed contracts:");
  console.log("  ProduceRegistry:     ", produceRegistryAddress);
  console.log("  ComplianceRegistry:  ", complianceRegistryAddress);
  console.log("");

  // Grab all available signers for this network. On localhost there are 20.
  // On amoy (or any live network) there will usually only be 1 — your own wallet.
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  // Fall back to the deployer wallet for any role that doesn't have its own
  // dedicated signer available (e.g. on a live testnet with only one account).
  const inspectorSigner = signers[1] ?? deployer;
  const regulatorSigner = signers[2] ?? deployer;

  if (signers.length < 3) {
    console.log(
      `Only ${signers.length} signer(s) available on network "${network.name}" — ` +
        `falling back to the deployer wallet for missing roles.\n`
    );
  }

  console.log("Assigning roles using signers:");
  console.log("  Deployer / Owner:", deployer.address);
  console.log("  Inspector:       ", inspectorSigner.address);
  console.log("  Regulator:       ", regulatorSigner.address);
  console.log("");

  const produceRegistry = (await ethers.getContractAt(
    "ProduceRegistry",
    produceRegistryAddress
  )) as unknown as ProduceRegistry;

  const complianceRegistry = (await ethers.getContractAt(
    "ComplianceRegistry",
    complianceRegistryAddress
  )) as unknown as ComplianceRegistry;

  // --- ProduceRegistry roles ---
  const txRegulatorPR = await produceRegistry
    .connect(deployer)
    .addRegulator(regulatorSigner.address);
  await txRegulatorPR.wait();
  console.log("✔ Added regulator on ProduceRegistry");

  // --- ComplianceRegistry roles ---
  const txInspectorCR = await complianceRegistry
    .connect(deployer)
    .addInspector(inspectorSigner.address);
  await txInspectorCR.wait();
  console.log("✔ Added inspector on ComplianceRegistry");

  const txRegulatorCR = await complianceRegistry
    .connect(deployer)
    .addRegulator(regulatorSigner.address);
  await txRegulatorCR.wait();
  console.log("✔ Added regulator on ComplianceRegistry");

  console.log("");
  console.log("All roles assigned successfully.");
  console.log("");
  console.log("Reference addresses for testing:");
  console.log("  Inspector wallet:", inspectorSigner.address);
  console.log("  Regulator wallet:", regulatorSigner.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});