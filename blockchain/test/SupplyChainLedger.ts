import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { ProduceRegistry, SupplyChainLedger } from "../typechain-types";

describe("SupplyChainLedger", function () {
  let produceRegistry: ProduceRegistry;
  let supplyChainLedger: SupplyChainLedger;
  let owner: any, farmer: any, distributor: any, retailer: any;

  const batchId = "AGT-0001";
  const farmId = "FARM-001";

  beforeEach(async function () {
    [owner, farmer, distributor, retailer] = await ethers.getSigners();

    const ProduceRegistryFactory = await ethers.getContractFactory("ProduceRegistry");
    produceRegistry = (await ProduceRegistryFactory.deploy()) as unknown as ProduceRegistry;
    await produceRegistry.waitForDeployment();

    const SupplyChainLedgerFactory = await ethers.getContractFactory("SupplyChainLedger");
    supplyChainLedger = (await SupplyChainLedgerFactory.deploy(
      await produceRegistry.getAddress()
    )) as unknown as SupplyChainLedger;
    await supplyChainLedger.waitForDeployment();

    await produceRegistry
      .connect(owner)
      .setSupplyChainLedger(await supplyChainLedger.getAddress());

    await produceRegistry
      .connect(farmer)
      .registerBatch(batchId, "Maize", 500, "SAMMAZ-15", true, farmId);
  });

  describe("Recording handoffs", function () {
    it("records a handoff and updates batch status to IN_TRANSIT", async function () {
      await expect(
        supplyChainLedger
          .connect(distributor)
          .recordHandoff(
            batchId,
            "Farm Gate",
            "AgriTrust Logistics",
            "Ilorin Hub",
            "Good condition",
            "Refrigerated Truck",
            495
          )
      )
        .to.emit(supplyChainLedger, "HandoffRecorded")
        .withArgs(batchId, "Farm Gate", "AgriTrust Logistics", anyValue);

      const batch = await produceRegistry.getBatch(batchId);
      expect(batch.status).to.equal(2); // IN_TRANSIT

      const custodian = await supplyChainLedger.getCurrentCustodian(batchId);
      expect(custodian).to.equal(distributor.address);
    });

    it("records multiple handoffs in order in the history", async function () {
      await supplyChainLedger
        .connect(distributor)
        .recordHandoff(batchId, "Farm Gate", "Logistics Co", "Hub A", "Good", "Truck", 495);

      await supplyChainLedger
        .connect(retailer)
        .recordHandoff(batchId, "Logistics Co", "Retail Store", "Hub B", "Good", "Van", 490);

      const history = await supplyChainLedger.getHandoffHistory(batchId);
      expect(history.length).to.equal(2);
      expect(history[0].toParty).to.equal("Logistics Co");
      expect(history[1].toParty).to.equal("Retail Store");
      expect(history[1].fromWallet).to.equal(distributor.address);
      expect(history[1].toWallet).to.equal(retailer.address);

      const custodian = await supplyChainLedger.getCurrentCustodian(batchId);
      expect(custodian).to.equal(retailer.address);
    });
  });

  describe("Recording delivery", function () {
    beforeEach(async function () {
      await supplyChainLedger
        .connect(distributor)
        .recordHandoff(batchId, "Farm Gate", "Logistics Co", "Hub A", "Good", "Truck", 495);
    });

    it("records delivery and updates batch status to DELIVERED", async function () {
      await expect(
        supplyChainLedger.connect(distributor).recordDelivery(batchId, "Lagos Central Market")
      )
        .to.emit(supplyChainLedger, "BatchDelivered")
        .withArgs(batchId, "Lagos Central Market", anyValue);

      const batch = await produceRegistry.getBatch(batchId);
      expect(batch.status).to.equal(3); // DELIVERED
    });
  });

  describe("Empty history", function () {
    it("returns an empty array for a batch with no handoffs yet", async function () {
      const history = await supplyChainLedger.getHandoffHistory(batchId);
      expect(history.length).to.equal(0);
    });
  });
});