import "server-only";

import { createHash } from "node:crypto";

import { createPublicClient, decodeEventLog, http, type Address, type Hex } from "viem";
import { polygonAmoy } from "viem/chains";

import {
  COMPLIANCE_REGISTRY_ADDRESS,
  PRODUCE_REGISTRY_ADDRESS,
  complianceRegistryAbi,
  produceRegistryAbi,
} from "../contracts";
import { supabaseAdmin } from "../supabase-admin";

const EVENT_BLOCK_CHUNK = BigInt(1_500);
const chainStatusNames = ["REGISTERED", "INSPECTED", "IN_TRANSIT", "DELIVERED", "FLAGGED"] as const;

type ChainStatusName = (typeof chainStatusNames)[number];
type DatabaseBatchStatus = "REGISTERED" | "CERTIFIED" | "IN_TRANSIT" | "DELIVERED" | "FLAGGED";

interface InspectorProfile {
  id: string;
  wallet_address: string;
}

interface DatabaseBatch {
  batch_id: string;
  farm_id: string | null;
  registered_by: string;
  crop_type: string;
  quantity_kg: number;
  seed_variety: string | null;
  is_gmo_free: boolean;
  gmo_status: string;
  status: string;
  tx_hash: string | null;
  registered_at: string;
}

interface DatabaseInspection {
  id: string;
  batch_id: string;
  inspector_id: string;
  weight_kg: number | null;
  quality_grade: string | null;
  gmo_test_result: string | null;
  certificate_issued: boolean;
  tx_hash: string | null;
  inspected_at: string;
}

interface VerifiedChainState {
  chainId: number;
  batchStatus: ChainStatusName;
  databaseTargetStatus: DatabaseBatchStatus;
  inspectionTransactionHash: Hex;
  certificateTransactionHash: Hex;
  inspection: {
    inspectorId: string;
    weightKg: number;
    qualityGrade: string;
    gmoTestResult: "PENDING" | "NON_GMO" | "GMO_PRESENT";
    inspectedAt: string;
    inspectedBy: Address;
  };
  certificate: {
    certificateId: string;
    issuedAt: string;
    validUntil: string;
    isActive: boolean;
    issuedBy: Address;
  };
}

export interface InspectionSyncState {
  batchId: string;
  synchronized: boolean;
  mismatches: string[];
  blockchain: VerifiedChainState;
  database: {
    batch: DatabaseBatch;
    inspections: DatabaseInspection[];
  };
}

export class InspectionSyncError extends Error {
  constructor(
    public readonly stage: "authorization" | "blockchain" | "database_read" | "database_write" | "verification",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "InspectionSyncError";
  }
}

function getPublicClient() {
  const rpcUrl = process.env.NEXT_PUBLIC_AMOY_RPC_URL;
  if (!rpcUrl) {
    throw new InspectionSyncError("blockchain", "Polygon Amoy RPC is not configured.", 503);
  }

  return createPublicClient({ chain: polygonAmoy, transport: http(rpcUrl) });
}

function sameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

function timestampToIso(value: bigint) {
  const milliseconds = Number(value) * 1_000;
  if (!Number.isSafeInteger(milliseconds)) {
    throw new InspectionSyncError("blockchain", "The on-chain timestamp is outside the supported range.", 409);
  }
  return new Date(milliseconds).toISOString();
}

function stableInspectionId(batchId: string) {
  const digest = createHash("sha256").update(`agritrust:inspection:${batchId}`).digest("hex");
  const chars = digest.slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = ((Number.parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const value = chars.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

let deploymentBlockPromise: Promise<bigint> | null = null;

async function findDeploymentBlock(client: ReturnType<typeof getPublicClient>, latestBlock: bigint) {
  if (deploymentBlockPromise) return deploymentBlockPromise;

  deploymentBlockPromise = (async () => {
    const latestCode = await client.getBytecode({ address: COMPLIANCE_REGISTRY_ADDRESS });
    if (!latestCode || latestCode === "0x") {
      throw new InspectionSyncError("blockchain", "The configured ComplianceRegistry is not deployed on Polygon Amoy.", 503);
    }

    let low = BigInt(0);
    let high = latestBlock;
    while (low < high) {
      const middle = (low + high) / BigInt(2);
      const code = await client.getBytecode({
        address: COMPLIANCE_REGISTRY_ADDRESS,
        blockNumber: middle,
      });
      if (code && code !== "0x") high = middle;
      else low = middle + BigInt(1);
    }
    return low;
  })().catch((error) => {
    deploymentBlockPromise = null;
    throw error;
  });

  return deploymentBlockPromise;
}

async function findLifecycleTransactions(
  client: ReturnType<typeof getPublicClient>,
  batchId: string,
  certificateId: string,
  inspectedBy: Address,
  issuedBy: Address,
) {
  const latestBlock = await client.getBlockNumber();
  const deploymentBlock = await findDeploymentBlock(client, latestBlock);
  let inspectionTransactionHash: Hex | null = null;
  let certificateTransactionHash: Hex | null = null;
  let toBlock = latestBlock;

  while (toBlock >= deploymentBlock && (!inspectionTransactionHash || !certificateTransactionHash)) {
    const fromBlock = toBlock - deploymentBlock >= EVENT_BLOCK_CHUNK
      ? toBlock - EVENT_BLOCK_CHUNK + BigInt(1)
      : deploymentBlock;
    const logs = await client.getLogs({
      address: COMPLIANCE_REGISTRY_ADDRESS,
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      try {
        const decoded = decodeEventLog({
          abi: complianceRegistryAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "InspectionRecorded") {
          const args = decoded.args;
          if (args.batchId === batchId && log.transactionHash) {
            inspectionTransactionHash = log.transactionHash;
          }
        }
        if (decoded.eventName === "CertificateIssued") {
          const args = decoded.args;
          if (
            args.batchId === batchId &&
            args.certId === certificateId &&
            sameAddress(args.issuedBy, issuedBy) &&
            log.transactionHash
          ) {
            certificateTransactionHash = log.transactionHash;
          }
        }
      } catch {
        // This contract also emits ProduceRegistry events; unrelated logs are ignored.
      }
    }

    if (fromBlock === deploymentBlock) break;
    toBlock = fromBlock - BigInt(1);
  }

  if (!inspectionTransactionHash || !certificateTransactionHash) {
    throw new InspectionSyncError(
      "blockchain",
      "The confirmed inspection and certificate events could not both be located.",
      409,
    );
  }

  const [inspectionReceipt, certificateReceipt] = await Promise.all([
    client.getTransactionReceipt({ hash: inspectionTransactionHash }),
    client.getTransactionReceipt({ hash: certificateTransactionHash }),
  ]);

  if (
    inspectionReceipt.status !== "success" ||
    certificateReceipt.status !== "success" ||
    !inspectionReceipt.to ||
    !certificateReceipt.to ||
    !sameAddress(inspectionReceipt.to, COMPLIANCE_REGISTRY_ADDRESS) ||
    !sameAddress(certificateReceipt.to, COMPLIANCE_REGISTRY_ADDRESS) ||
    !sameAddress(inspectionReceipt.from, inspectedBy) ||
    !sameAddress(certificateReceipt.from, issuedBy)
  ) {
    throw new InspectionSyncError(
      "blockchain",
      "The inspection or certificate receipt does not match the verified contract state.",
      409,
    );
  }

  return { inspectionTransactionHash, certificateTransactionHash };
}

async function readVerifiedChainState(batchId: string, profile: InspectorProfile): Promise<VerifiedChainState> {
  const client = getPublicClient();
  const chainId = await client.getChainId();
  if (chainId !== polygonAmoy.id) {
    throw new InspectionSyncError("blockchain", "The configured RPC is not Polygon Amoy.", 503);
  }

  const wallet = profile.wallet_address as Address;
  const [batch, inspection, certificate, approved] = await Promise.all([
    client.readContract({
      address: PRODUCE_REGISTRY_ADDRESS,
      abi: produceRegistryAbi,
      functionName: "getBatch",
      args: [batchId],
    }),
    client.readContract({
      address: COMPLIANCE_REGISTRY_ADDRESS,
      abi: complianceRegistryAbi,
      functionName: "getInspection",
      args: [batchId],
    }),
    client.readContract({
      address: COMPLIANCE_REGISTRY_ADDRESS,
      abi: complianceRegistryAbi,
      functionName: "getCertificate",
      args: [batchId],
    }),
    client.readContract({
      address: COMPLIANCE_REGISTRY_ADDRESS,
      abi: complianceRegistryAbi,
      functionName: "isApprovedInspector",
      args: [wallet],
    }),
  ]);

  const statusIndex = Number(batch.status);
  const batchStatus = chainStatusNames[statusIndex];
  if (!batchStatus || statusIndex < 1) {
    throw new InspectionSyncError("blockchain", "The batch has no confirmed inspection on-chain.", 409);
  }
  if (!approved) {
    throw new InspectionSyncError("authorization", "The profile wallet is no longer an approved Inspector.", 403);
  }
  if (!sameAddress(inspection.inspectedBy, wallet) || !sameAddress(certificate.issuedBy, wallet)) {
    throw new InspectionSyncError(
      "authorization",
      "The signed-in Inspector did not create both verified on-chain records.",
      403,
    );
  }
  if (!certificate.isActive) {
    throw new InspectionSyncError("blockchain", "The on-chain certificate is not active.", 409);
  }

  const { inspectionTransactionHash, certificateTransactionHash } = await findLifecycleTransactions(
    client,
    batchId,
    certificate.certId,
    inspection.inspectedBy,
    certificate.issuedBy,
  );

  const databaseTargetStatus: DatabaseBatchStatus =
    batchStatus === "INSPECTED" ? "CERTIFIED" : batchStatus;
  const gmoTestResult =
    Number(inspection.gmoStatus) === 1
      ? "NON_GMO"
      : Number(inspection.gmoStatus) === 2
        ? "GMO_PRESENT"
        : "PENDING";

  return {
    chainId,
    batchStatus,
    databaseTargetStatus,
    inspectionTransactionHash,
    certificateTransactionHash,
    inspection: {
      inspectorId: inspection.inspectorId,
      weightKg: Number(inspection.physicalWeightKg),
      qualityGrade: inspection.qualityGrade,
      gmoTestResult,
      inspectedAt: timestampToIso(inspection.inspectedAt),
      inspectedBy: inspection.inspectedBy,
    },
    certificate: {
      certificateId: certificate.certId,
      issuedAt: timestampToIso(certificate.issuedAt),
      validUntil: timestampToIso(certificate.validUntil),
      isActive: certificate.isActive,
      issuedBy: certificate.issuedBy,
    },
  };
}

async function readDatabaseState(batchId: string) {
  const [batchResult, inspectionResult] = await Promise.all([
    supabaseAdmin.from("batches").select("*").eq("batch_id", batchId).maybeSingle(),
    supabaseAdmin
      .from("inspections")
      .select("*")
      .eq("batch_id", batchId)
      .order("inspected_at", { ascending: true }),
  ]);

  if (batchResult.error) {
    throw new InspectionSyncError("database_read", `Batch lookup failed: ${batchResult.error.message}`, 503);
  }
  if (!batchResult.data) {
    throw new InspectionSyncError("database_read", "The batch does not exist in Supabase.", 404);
  }
  if (inspectionResult.error) {
    throw new InspectionSyncError(
      "database_read",
      `Inspection lookup failed: ${inspectionResult.error.message}`,
      503,
    );
  }

  return {
    batch: batchResult.data as DatabaseBatch,
    inspections: (inspectionResult.data ?? []) as DatabaseInspection[],
  };
}

function compareState(
  chain: VerifiedChainState,
  database: Awaited<ReturnType<typeof readDatabaseState>>,
  profile: InspectorProfile,
) {
  const mismatches: string[] = [];
  if (database.inspections.length !== 1) {
    mismatches.push(`Expected one inspection row; found ${database.inspections.length}.`);
  }

  const inspection = database.inspections[0];
  if (inspection) {
    if (inspection.inspector_id !== profile.id) mismatches.push("Inspection owner differs from the on-chain Inspector.");
    if (Number(inspection.weight_kg) !== chain.inspection.weightKg) mismatches.push("Inspection weight differs from chain.");
    if (inspection.quality_grade !== chain.inspection.qualityGrade) mismatches.push("Inspection grade differs from chain.");
    if (inspection.gmo_test_result !== chain.inspection.gmoTestResult) mismatches.push("Inspection GMO result differs from chain.");
    if (!inspection.certificate_issued) mismatches.push("Certificate is not marked as issued.");
    if (
      !inspection.tx_hash ||
      inspection.tx_hash.toLowerCase() !== chain.certificateTransactionHash.toLowerCase()
    ) {
      mismatches.push("Inspection transaction hash is not the certificate transaction hash.");
    }
    if (new Date(inspection.inspected_at).getTime() !== new Date(chain.inspection.inspectedAt).getTime()) {
      mismatches.push("Inspection timestamp differs from chain.");
    }
  }

  if (database.batch.status !== chain.databaseTargetStatus) {
    mismatches.push(`Batch status is ${database.batch.status}; expected ${chain.databaseTargetStatus}.`);
  }
  if (database.batch.gmo_status !== "inspector_verified") {
    mismatches.push("Batch GMO status is not inspector_verified.");
  }

  return mismatches;
}

export async function inspectInspectionSync(batchId: string, profile: InspectorProfile): Promise<InspectionSyncState> {
  const [blockchain, database] = await Promise.all([
    readVerifiedChainState(batchId, profile),
    readDatabaseState(batchId),
  ]);
  const mismatches = compareState(blockchain, database, profile);
  return { batchId, synchronized: mismatches.length === 0, mismatches, blockchain, database };
}

export async function synchronizeInspection(batchId: string, profile: InspectorProfile) {
  const before = await inspectInspectionSync(batchId, profile);
  if (before.database.inspections.length > 1) {
    throw new InspectionSyncError(
      "verification",
      "Multiple inspection rows exist for this batch. Automatic synchronization stopped to preserve history.",
      409,
    );
  }

  const inspectionPayload = {
    batch_id: batchId,
    inspector_id: profile.id,
    weight_kg: before.blockchain.inspection.weightKg,
    quality_grade: before.blockchain.inspection.qualityGrade,
    gmo_test_result: before.blockchain.inspection.gmoTestResult,
    certificate_issued: true,
    tx_hash: before.blockchain.certificateTransactionHash,
    inspected_at: before.blockchain.inspection.inspectedAt,
  };
  const existingInspection = before.database.inspections[0];
  const inspectionWrite = existingInspection
    ? await supabaseAdmin
        .from("inspections")
        .update(inspectionPayload)
        .eq("id", existingInspection.id)
        .select("*")
        .single()
    : await supabaseAdmin
        .from("inspections")
        .upsert({ id: stableInspectionId(batchId), ...inspectionPayload }, { onConflict: "id" })
        .select("*")
        .single();

  if (inspectionWrite.error || !inspectionWrite.data) {
    throw new InspectionSyncError(
      "database_write",
      `Inspection synchronization failed: ${inspectionWrite.error?.message ?? "no row was returned"}`,
      503,
    );
  }

  const batchWrite = await supabaseAdmin
    .from("batches")
    .update({
      status: before.blockchain.databaseTargetStatus,
      gmo_status: "inspector_verified",
    })
    .eq("batch_id", batchId)
    .select("*")
    .single();

  if (batchWrite.error || !batchWrite.data) {
    throw new InspectionSyncError(
      "database_write",
      `Batch synchronization failed: ${batchWrite.error?.message ?? "no row was returned"}`,
      503,
    );
  }

  const database = await readDatabaseState(batchId);
  const mismatches = compareState(before.blockchain, database, profile);
  if (mismatches.length > 0) {
    throw new InspectionSyncError(
      "verification",
      `Synchronization verification failed: ${mismatches.join(" ")}`,
      503,
    );
  }

  return {
    batchId,
    synchronized: true,
    mismatches: [],
    blockchain: before.blockchain,
    database,
  } satisfies InspectionSyncState;
}
