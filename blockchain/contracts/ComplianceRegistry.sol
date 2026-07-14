// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IProduceRegistry {
    enum BatchStatus {
        REGISTERED,
        INSPECTED,
        IN_TRANSIT,
        DELIVERED,
        FLAGGED
    }

    function updateBatchStatus(string calldata batchId, BatchStatus newStatus) external;
}

contract ComplianceRegistry {
    enum GMOStatus {
        PENDING,
        NON_GMO,
        GMO_DETECTED
    }

    struct Inspection {
        string batchId;
        string inspectorId;
        uint256 physicalWeightKg;
        string qualityGrade;
        GMOStatus gmoStatus;
        string biosafetyGrade;
        bool meetsNAFDACStandards;
        string notes;
        uint256 inspectedAt;
        address inspectedBy;
    }

    struct Certificate {
        string certId;
        string batchId;
        string inspectorId;
        GMOStatus gmoStatus;
        string grade;
        uint256 issuedAt;
        uint256 validUntil;
        bool isActive;
        address issuedBy;
    }

    address public owner;
    IProduceRegistry public produceRegistry;

    mapping(address => bool) private inspectors;
    mapping(address => bool) private regulators;

    mapping(string => Inspection) private inspections;
    mapping(string => bool) private inspectionExists;

    // Keyed by batchId, matching the doc's getCertificate(batchId) signature.
    // NOTE: this means a batch can only ever hold one "current" certificate.
    // If a batch needs to be re-certified, the previous certificate is overwritten here.
    mapping(string => Certificate) private certificates;
    mapping(string => bool) private certificateExists;

    event InspectionRecorded(
        string batchId,
        string inspectorId,
        GMOStatus gmoStatus,
        string grade
    );
    event CertificateIssued(
        string certId,
        string batchId,
        address issuedBy,
        uint256 issuedAt
    );
    event CertificateRevoked(string certId, string batchId, string reason);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyInspector() {
        require(inspectors[msg.sender], "Not an inspector");
        _;
    }

    modifier onlyRegulator() {
        require(regulators[msg.sender], "Not a regulator");
        _;
    }

    constructor(address _produceRegistry) {
        owner = msg.sender;
        produceRegistry = IProduceRegistry(_produceRegistry);
    }

    // --- Setup functions ---

    function addInspector(address account) external onlyOwner {
        inspectors[account] = true;
    }

    function addRegulator(address account) external onlyOwner {
        regulators[account] = true;
    }

    // --- Core functions ---

    function recordInspection(
        string calldata batchId,
        string calldata inspectorId,
        uint256 weightKg,
        string calldata grade,
        GMOStatus gmoStatus,
        string calldata biosafetyGrade,
        bool meetsNAFDAC,
        string calldata notes
    ) external onlyInspector {
        inspections[batchId] = Inspection({
            batchId: batchId,
            inspectorId: inspectorId,
            physicalWeightKg: weightKg,
            qualityGrade: grade,
            gmoStatus: gmoStatus,
            biosafetyGrade: biosafetyGrade,
            meetsNAFDACStandards: meetsNAFDAC,
            notes: notes,
            inspectedAt: block.timestamp,
            inspectedBy: msg.sender
        });
        inspectionExists[batchId] = true;

        emit InspectionRecorded(batchId, inspectorId, gmoStatus, grade);

        produceRegistry.updateBatchStatus(batchId, IProduceRegistry.BatchStatus.INSPECTED);
    }

    function issueCertificate(
        string calldata batchId,
        string calldata certId,
        uint256 validFrom,
        uint256 validUntil
    ) external onlyInspector {
        require(inspectionExists[batchId], "Batch has not been inspected");

        Inspection memory inspection = inspections[batchId];

        certificates[batchId] = Certificate({
            certId: certId,
            batchId: batchId,
            inspectorId: inspection.inspectorId,
            gmoStatus: inspection.gmoStatus,
            grade: inspection.qualityGrade,
            issuedAt: validFrom == 0 ? block.timestamp : validFrom,
            validUntil: validUntil,
            isActive: true,
            issuedBy: msg.sender
        });
        certificateExists[batchId] = true;

        emit CertificateIssued(certId, batchId, msg.sender, block.timestamp);
    }

    function getCertificate(string calldata batchId) external view returns (Certificate memory) {
        require(certificateExists[batchId], "Certificate not found");
        return certificates[batchId];
    }

    function getInspection(string calldata batchId) external view returns (Inspection memory) {
        require(inspectionExists[batchId], "Inspection not found");
        return inspections[batchId];
    }

    // NOTE: the doc specifies revokeCertificate(batchId, reason) directly,
    // which is used here since certificates are keyed by batchId.
    function revokeCertificate(string calldata batchId, string calldata reason) external onlyRegulator {
        require(certificateExists[batchId], "Certificate not found");
        Certificate storage cert = certificates[batchId];
        cert.isActive = false;
        emit CertificateRevoked(cert.certId, batchId, reason);
    }
}