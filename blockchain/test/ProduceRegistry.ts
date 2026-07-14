import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { ProduceRegistry } from "../typechain-types";

describe("ProduceRegistry", function () {
  let produceRegistry: ProduceRegistry;
  let owner: any, complianceStandIn: any, regulator: any, farmer: any;

  const batchId = "AGT-0001";
  const farmId = "FARM-001";

  beforeEach(async function () {
    [owner, complianceStandIn, regulator, farmer] = await ethers.getSigners();

    const ProduceRegistryFactory = await ethers.getContractFactory("ProduceRegistry");
    produceRegistry = (await ProduceRegistryFactory.deploy()) as unknown as ProduceRegistry;
    await produceRegistry.waitForDeployment();

    // For these tests we don't have real ComplianceRegistry/SupplyChainLedger contracts,
    // so we register a normal signer as a stand-in "sibling contract" to test
    // updateBatchStatus access control.
    await produceRegistry.connect(owner).setComplianceRegistry(complianceStandIn.address);
    await produceRegistry.connect(owner).addRegulator(regulator.address);
  });

  describe("Batch registration", function () {
    it("registers a new batch with correct fields", async function () {
      await expect(
        produceRegistry
          .connect(farmer)
          .registerBatch(batchId, "Maize", 500, "SAMMAZ-15", true, farmId)
      )
        .to.emit(produceRegistry, "BatchRegistered")
        .withArgs(batchId, farmId, farmer.address, anyValue);

      const batch = await produceRegistry.getBatch(batchId);
      expect(batch.batchId).to.equal(batchId);
      expect(batch.farmId).to.equal(farmId);
      expect(batch.cropType).to.equal("Maize");
      expect(batch.quantityKg).to.equal(500);
      expect(batch.seedVariety).to.equal("SAMMAZ-15");
      expect(batch.isGMOFree).to.equal(true);
      expect(batch.status).to.equal(0); // REGISTERED
      expect(batch.registeredBy).to.equal(farmer.address);
    });

    it("rejects registering the same batchId twice", async function () {
      await produceRegistry
        .connect(farmer)
        .registerBatch(batchId, "Maize", 500, "SAMMAZ-15", true, farmId);

      await expect(
        produceRegistry
          .connect(farmer)
          .registerBatch(batchId, "Maize", 500, "SAMMAZ-15", true, farmId)
      ).to.be.revertedWith("Batch already exists");
    });

    it("tracks batches by farmId", async function () {
      await produceRegistry
        .connect(farmer)
        .registerBatch(batchId, "Maize", 500, "SAMMAZ-15", true, farmId);
      await produceRegistry
        .connect(farmer)
        .registerBatch("AGT-0002", "Rice", 300, "FARO-44", true, farmId);

      const batches = await produceRegistry.getBatchesByFarm(farmId);
      expect(batches).to.deep.equal([batchId, "AGT-0002"]);
    });

    it("reverts when fetching a batch that does not exist", async function () {
      await expect(produceRegistry.getBatch("NON-EXISTENT")).to.be.revertedWith(
        "Batch not found"
      );
    });
  });

  describe("Status updates (sibling contract access control)", function () {
    beforeEach(async function () {
      await produceRegistry
        .connect(farmer)
        .registerBatch(batchId, "Maize", 500, "SAMMAZ-15", true, farmId);
    });

    it("allows an authorized sibling contract address to update status", async function () {
      await expect(
        produceRegistry.connect(complianceStandIn).updateBatchStatus(batchId, 1) // INSPECTED
      )
        .to.emit(produceRegistry, "BatchStatusChanged")
        .withArgs(batchId, 1);

      const batch = await produceRegistry.getBatch(batchId);
      expect(batch.status).to.equal(1);
    });

    it("rejects status updates from a random address", async function () {
      await expect(
        produceRegistry.connect(farmer).updateBatchStatus(batchId, 1)
      ).to.be.revertedWith("Caller is not an authorized contract");
    });

    it("reverts updating status of a non-existent batch", async function () {
      await expect(
        produceRegistry.connect(complianceStandIn).updateBatchStatus("NOPE", 1)
      ).to.be.revertedWith("Batch not found");
    });
  });

  describe("Flagging (regulator only)", function () {
    beforeEach(async function () {
      await produceRegistry
        .connect(farmer)
        .registerBatch(batchId, "Maize", 500, "SAMMAZ-15", true, farmId);
    });

    it("allows a regulator to flag a batch", async function () {
      await expect(produceRegistry.connect(regulator).flagBatch(batchId, "Suspected contamination"))
        .to.emit(produceRegistry, "BatchFlagged")
        .withArgs(batchId, "Suspected contamination");

      const batch = await produceRegistry.getBatch(batchId);
      expect(batch.status).to.equal(4); // FLAGGED
    });

    it("rejects flagging from a non-regulator", async function () {
      await expect(
        produceRegistry.connect(farmer).flagBatch(batchId, "Suspected contamination")
      ).to.be.revertedWith("Not a regulator");
    });
  });

  describe("Owner-only setup functions", function () {
    it("rejects setComplianceRegistry from a non-owner", async function () {
      await expect(
        produceRegistry.connect(farmer).setComplianceRegistry(farmer.address)
      ).to.be.revertedWith("Not contract owner");
    });

    it("rejects addRegulator from a non-owner", async function () {
      await expect(
        produceRegistry.connect(farmer).addRegulator(farmer.address)
      ).to.be.revertedWith("Not contract owner");
    });
  });
});