import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { ProduceRegistry, ComplianceRegistry } from "../typechain-types";

describe("ComplianceRegistry", function () {
  let produceRegistry: ProduceRegistry;
  let complianceRegistry: ComplianceRegistry;
  let owner: any, inspector: any, regulator: any, farmer: any, randomUser: any;

  const batchId = "AGT-0001";
  const farmId = "FARM-001";

  beforeEach(async function () {
    [owner, inspector, regulator, farmer, randomUser] = await ethers.getSigners();

    const ProduceRegistryFactory = await ethers.getContractFactory("ProduceRegistry");
    produceRegistry = (await ProduceRegistryFactory.deploy()) as unknown as ProduceRegistry;
    await produceRegistry.waitForDeployment();

    const ComplianceRegistryFactory = await ethers.getContractFactory("ComplianceRegistry");
    complianceRegistry = (await ComplianceRegistryFactory.deploy(
      await produceRegistry.getAddress()
    )) as unknown as ComplianceRegistry;
    await complianceRegistry.waitForDeployment();

    // Wire ComplianceRegistry as an authorized caller of updateBatchStatus
    await produceRegistry
      .connect(owner)
      .setComplianceRegistry(await complianceRegistry.getAddress());

    await complianceRegistry.connect(owner).addInspector(inspector.address);
    await complianceRegistry.connect(owner).addRegulator(regulator.address);

    await produceRegistry
      .connect(farmer)
      .registerBatch(batchId, "Maize", 500, "SAMMAZ-15", true, farmId);
  });

  describe("Recording inspections", function () {
    it("allows an inspector to record an inspection and updates batch status", async function () {
      await expect(
        complianceRegistry
          .connect(inspector)
          .recordInspection(
            batchId,
            "INSP-001",
            495,
            "Grade A",
            1, // NON_GMO
            "Biosafety Level 1",
            true,
            "All good"
          )
      )
        .to.emit(complianceRegistry, "InspectionRecorded")
        .withArgs(batchId, "INSP-001", 1, "Grade A");

      const inspection = await complianceRegistry.getInspection(batchId);
      expect(inspection.physicalWeightKg).to.equal(495);
      expect(inspection.qualityGrade).to.equal("Grade A");
      expect(inspection.meetsNAFDACStandards).to.equal(true);

      // Confirm the cross-contract call actually updated ProduceRegistry
      const batch = await produceRegistry.getBatch(batchId);
      expect(batch.status).to.equal(1); // INSPECTED
    });

    it("rejects inspection recording from a non-inspector", async function () {
      await expect(
        complianceRegistry
          .connect(randomUser)
          .recordInspection(batchId, "INSP-001", 495, "Grade A", 1, "BSL-1", true, "notes")
      ).to.be.revertedWith("Not an inspector");
    });
  });

  describe("Certificates", function () {
    beforeEach(async function () {
      await complianceRegistry
        .connect(inspector)
        .recordInspection(batchId, "INSP-001", 495, "Grade A", 1, "BSL-1", true, "notes");
    });

    it("issues a certificate after inspection", async function () {
      const now = Math.floor(Date.now() / 1000);

      await expect(
        complianceRegistry
          .connect(inspector)
          .issueCertificate(batchId, "CERT-001", now, now + 31536000)
      )
        .to.emit(complianceRegistry, "CertificateIssued")
        .withArgs("CERT-001", batchId, inspector.address, anyValue);

      const cert = await complianceRegistry.getCertificate(batchId);
      expect(cert.certId).to.equal("CERT-001");
      expect(cert.isActive).to.equal(true);
      expect(cert.grade).to.equal("Grade A");
    });

    it("rejects issuing a certificate for a batch with no inspection", async function () {
      await expect(
        complianceRegistry
          .connect(inspector)
          .issueCertificate("NEVER-INSPECTED", "CERT-999", 0, 0)
      ).to.be.revertedWith("Batch has not been inspected");
    });

    it("rejects certificate issuance from a non-inspector", async function () {
      await expect(
        complianceRegistry.connect(randomUser).issueCertificate(batchId, "CERT-002", 0, 0)
      ).to.be.revertedWith("Not an inspector");
    });
  });

  describe("Revoking certificates", function () {
    beforeEach(async function () {
      await complianceRegistry
        .connect(inspector)
        .recordInspection(batchId, "INSP-001", 495, "Grade A", 1, "BSL-1", true, "notes");
      await complianceRegistry
        .connect(inspector)
        .issueCertificate(batchId, "CERT-001", 0, 0);
    });

    it("allows a regulator to revoke a certificate", async function () {
      await expect(
        complianceRegistry.connect(regulator).revokeCertificate(batchId, "Fraud suspected")
      )
        .to.emit(complianceRegistry, "CertificateRevoked")
        .withArgs("CERT-001", batchId, "Fraud suspected");

      const cert = await complianceRegistry.getCertificate(batchId);
      expect(cert.isActive).to.equal(false);
    });

    it("rejects revocation from a non-regulator", async function () {
      await expect(
        complianceRegistry.connect(farmer).revokeCertificate(batchId, "Fraud suspected")
      ).to.be.revertedWith("Not a regulator");
    });
  });
});