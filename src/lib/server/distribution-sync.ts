import "server-only";

import { createHash } from "node:crypto";

import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  http,
  type Address,
  type Hex,
} from "viem";
import { polygonAmoy } from "viem/chains";

import {
  PRODUCE_REGISTRY_ADDRESS,
  SUPPLY_CHAIN_LEDGER_ADDRESS,
  produceRegistryAbi,
  supplyChainLedgerAbi,
} from "../contracts";
import { supabaseAdmin } from "../supabase-admin";

const EVENT_BLOCK_CHUNK = BigInt(1_500);
const chainStatusNames = ["REGISTERED", "INSPECTED", "IN_TRANSIT", "DELIVERED", "FLAGGED"] as const;
const FINAL_DELIVERY_CONDITION = "Final market delivery recorded on-chain";

type ChainStatusName = (typeof chainStatusNames)[number];
type DatabaseBatchStatus = "REGISTERED" | "CERTIFIED" | "IN_TRANSIT" | "DELIVERED" | "FLAGGED";

export interface DistributorProfile {
  id: string;
  wallet_address: string;
}

interface DatabaseBatch {
  batch_id: string;
  status: string;
  gmo_status: string;
}

interface DatabaseHandoff {
  id: string;
  batch_id: string;
  distributor_id: string;
  from_party: string | null;
  to_party: string | null;
  location: string | null;
  condition: string | null;
  transport_method: string | null;
  tx_hash: string | null;
  handed_off_at: string;
}

interface VerifiedLifecycleEvent {
  type: "HANDOFF" | "DELIVERY";
  transactionHash: Hex;
  blockNumber: string;
  sender: Address;
  distributorId: string;
  timestamp: string;
  fromParty: string | null;
  toParty: string;
  location: string;
  condition: string | null;
  transportMethod: string | null;
  quantityKg: number | null;
}

interface VerifiedChainState {
  chainId: number;
  batchStatus: ChainStatusName;
  databaseTargetStatus: DatabaseBatchStatus;
  approvedDistributor: boolean;
  events: VerifiedLifecycleEvent[];
}

export interface DistributionSyncState {
  batchId: string;
  synchronized: boolean;
  mismatches: string[];
  blockchain: VerifiedChainState;
  database: {
    batch: DatabaseBatch;
    handoffs: DatabaseHandoff[];
  };
}

export class DistributionSyncError extends Error {
  constructor(
    public readonly stage:
      | "authorization"
      | "blockchain"
      | "database_read"
      | "database_write"
      | "verification",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DistributionSyncError";
  }
}

function getPublicClient() {
  const rpcUrl = process.env.NEXT_PUBLIC_AMOY_RPC_URL;
  if (!rpcUrl) {
    throw new DistributionSyncError("blockchain", "Polygon Amoy RPC is not configured.", 503);
  }
  return createPublicClient({ chain: polygonAmoy, transport: http(rpcUrl) });
}

function sameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

function timestampToIso(value: bigint) {
  const milliseconds = Number(value) * 1_000;
  if (!Number.isSafeInteger(milliseconds)) {
    throw new DistributionSyncError("blockchain", "An on-chain timestamp is outside the supported range.", 409);
  }
  return new Date(milliseconds).toISOString();
}

function sameInstant(left: string, right: string) {
  return new Date(left).getTime() === new Date(right).getTime();
}

function stableEventId(type: VerifiedLifecycleEvent["type"], transactionHash: Hex) {
  const digest = createHash("sha256")
    .update(`agritrust:${type.toLowerCase()}:${transactionHash.toLowerCase()}`)
    .digest("hex");
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
    const latestCode = await client.getBytecode({ address: SUPPLY_CHAIN_LEDGER_ADDRESS });
    if (!latestCode || latestCode === "0x") {
      throw new DistributionSyncError(
        "blockchain",
        "The configured SupplyChainLedger is not deployed on Polygon Amoy.",
        503,
      );
    }
    let low = BigInt(0);
    let high = latestBlock;
    while (low < high) {
      const middle = (low + high) / BigInt(2);
      const code = await client.getBytecode({ address: SUPPLY_CHAIN_LEDGER_ADDRESS, blockNumber: middle });
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

async function findBatchEventLogs(
  client: ReturnType<typeof getPublicClient>,
  batchId: string,
) {
  const latestBlock = await client.getBlockNumber();
  const deploymentBlock = await findDeploymentBlock(client, latestBlock);
  const matching: Array<{
    type: "HANDOFF" | "DELIVERY";
    transactionHash: Hex;
    blockNumber: bigint;
    timestamp: bigint;
    fromParty?: string;
    toParty?: string;
    location?: string;
  }> = [];

  let fromBlock = deploymentBlock;
  while (fromBlock <= latestBlock) {
    const toBlock = fromBlock + EVENT_BLOCK_CHUNK - BigInt(1) < latestBlock
      ? fromBlock + EVENT_BLOCK_CHUNK - BigInt(1)
      : latestBlock;
    const logs = await client.getLogs({
      address: SUPPLY_CHAIN_LEDGER_ADDRESS,
      fromBlock,
      toBlock,
    });
    for (const log of logs) {
      if (!log.transactionHash || log.blockNumber == null) continue;
      try {
        const decoded = decodeEventLog({
          abi: supplyChainLedgerAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "HandoffRecorded" && decoded.args.batchId === batchId) {
          matching.push({
            type: "HANDOFF",
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: decoded.args.timestamp,
            fromParty: decoded.args.fromParty,
            toParty: decoded.args.toParty,
          });
        }
        if (decoded.eventName === "BatchDelivered" && decoded.args.batchId === batchId) {
          matching.push({
            type: "DELIVERY",
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: decoded.args.timestamp,
            location: decoded.args.location,
          });
        }
      } catch {
        // Approval events and unrelated contract logs are intentionally ignored.
      }
    }
    fromBlock = toBlock + BigInt(1);
  }

  return matching.sort((left, right) => Number(left.blockNumber - right.blockNumber));
}

async function readVerifiedChainState(
  batchId: string,
  profile: DistributorProfile,
): Promise<VerifiedChainState> {
  const client = getPublicClient();
  const chainId = await client.getChainId();
  if (chainId !== polygonAmoy.id) {
    throw new DistributionSyncError("blockchain", "The configured RPC is not Polygon Amoy.", 503);
  }

  const wallet = profile.wallet_address as Address;
  const [batch, history, approvedDistributor, eventLogs] = await Promise.all([
    client.readContract({
      address: PRODUCE_REGISTRY_ADDRESS,
      abi: produceRegistryAbi,
      functionName: "getBatch",
      args: [batchId],
    }),
    client.readContract({
      address: SUPPLY_CHAIN_LEDGER_ADDRESS,
      abi: supplyChainLedgerAbi,
      functionName: "getHandoffHistory",
      args: [batchId],
    }),
    client.readContract({
      address: SUPPLY_CHAIN_LEDGER_ADDRESS,
      abi: supplyChainLedgerAbi,
      functionName: "isApprovedDistributor",
      args: [wallet],
    }),
    findBatchEventLogs(client, batchId),
  ]);

  if (!approvedDistributor) {
    throw new DistributionSyncError(
      "authorization",
      "The profile wallet is no longer an approved Distributor.",
      403,
    );
  }

  const statusIndex = Number(batch.status);
  const batchStatus = chainStatusNames[statusIndex];
  if (!batchStatus) {
    throw new DistributionSyncError("blockchain", "The batch has an unsupported on-chain status.", 409);
  }
  const databaseTargetStatus: DatabaseBatchStatus =
    batchStatus === "INSPECTED" ? "CERTIFIED" : batchStatus;

  const chainEvents: Omit<VerifiedLifecycleEvent, "distributorId">[] = [];
  for (const event of eventLogs) {
    const [receipt, transaction, block] = await Promise.all([
      client.getTransactionReceipt({ hash: event.transactionHash }),
      client.getTransaction({ hash: event.transactionHash }),
      client.getBlock({ blockNumber: event.blockNumber }),
    ]);
    if (
      receipt.status !== "success" ||
      !receipt.to ||
      !sameAddress(receipt.to, SUPPLY_CHAIN_LEDGER_ADDRESS) ||
      !sameAddress(transaction.to ?? "", SUPPLY_CHAIN_LEDGER_ADDRESS) ||
      !sameAddress(transaction.from, receipt.from) ||
      block.timestamp !== event.timestamp
    ) {
      throw new DistributionSyncError(
        "blockchain",
        "A supply-chain receipt does not match the configured contract or event timestamp.",
        409,
      );
    }

    if (!sameAddress(receipt.from, wallet)) continue;

    const decoded = decodeFunctionData({ abi: supplyChainLedgerAbi, data: transaction.input });
    if (event.type === "HANDOFF") {
      if (decoded.functionName !== "recordHandoff") {
        throw new DistributionSyncError("blockchain", "A handoff event has unexpected transaction input.", 409);
      }
      const [inputBatchId, fromParty, toParty, location, condition, transportMethod, quantityKg] = decoded.args;
      const historyRow = history.find(
        (row) =>
          row.timestamp === event.timestamp &&
          row.batchId === batchId &&
          row.fromParty === fromParty &&
          row.toParty === toParty &&
          sameAddress(row.toWallet, wallet),
      );
      if (
        inputBatchId !== batchId ||
        fromParty !== event.fromParty ||
        toParty !== event.toParty ||
        !historyRow ||
        historyRow.location !== location ||
        historyRow.conditionOnHandoff !== condition ||
        historyRow.transportMethod !== transportMethod ||
        historyRow.quantityKg !== quantityKg
      ) {
        throw new DistributionSyncError(
          "blockchain",
          "A handoff transaction does not match the authoritative on-chain history.",
          409,
        );
      }
      chainEvents.push({
        type: "HANDOFF",
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber.toString(),
        sender: receipt.from,
        timestamp: timestampToIso(event.timestamp),
        fromParty,
        toParty,
        location,
        condition,
        transportMethod,
        quantityKg: Number(quantityKg),
      });
    } else {
      if (decoded.functionName !== "recordDelivery") {
        throw new DistributionSyncError("blockchain", "A delivery event has unexpected transaction input.", 409);
      }
      const [inputBatchId, location] = decoded.args;
      if (inputBatchId !== batchId || location !== event.location) {
        throw new DistributionSyncError(
          "blockchain",
          "A delivery transaction does not match the authoritative delivery event.",
          409,
        );
      }
      const priorHandoff = [...history]
        .filter((row) => row.timestamp <= event.timestamp)
        .sort((left, right) => Number(right.timestamp - left.timestamp))[0];
      if (!priorHandoff || !sameAddress(priorHandoff.toWallet, receipt.from)) {
        throw new DistributionSyncError(
          "authorization",
          "A delivery was not submitted by the batch's latest confirmed custodian.",
          409,
        );
      }
      chainEvents.push({
        type: "DELIVERY",
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber.toString(),
        sender: receipt.from,
        timestamp: timestampToIso(event.timestamp),
        fromParty: priorHandoff?.toParty ?? null,
        toParty: location,
        location,
        condition: FINAL_DELIVERY_CONDITION,
        transportMethod: null,
        quantityKg: null,
      });
    }
  }

  const senderWallets = new Set(chainEvents.map((event) => event.sender.toLowerCase()));
  const { data: distributorProfiles, error: distributorProfilesError } = await supabaseAdmin
    .from("users")
    .select("id, role, wallet_address")
    .eq("role", "DISTRIBUTOR");
  if (distributorProfilesError) {
    throw new DistributionSyncError(
      "database_read",
      `Distributor ownership lookup failed: ${distributorProfilesError.message}`,
      503,
    );
  }
  const ownersByWallet = new Map<string, string>();
  for (const owner of distributorProfiles ?? []) {
    if (!owner.wallet_address || !senderWallets.has(owner.wallet_address.toLowerCase())) continue;
    const normalizedWallet = owner.wallet_address.toLowerCase();
    if (ownersByWallet.has(normalizedWallet)) {
      throw new DistributionSyncError(
        "verification",
        "Multiple Distributor profiles claim the same on-chain sender wallet.",
        409,
      );
    }
    ownersByWallet.set(normalizedWallet, owner.id);
  }
  const events = chainEvents.map((event) => {
    const distributorId = ownersByWallet.get(event.sender.toLowerCase());
    if (!distributorId) {
      throw new DistributionSyncError(
        "verification",
        "A confirmed supply-chain event has no matching Distributor profile.",
        409,
      );
    }
    return { ...event, distributorId };
  });

  return { chainId, batchStatus, databaseTargetStatus, approvedDistributor, events };
}

async function readDatabaseState(batchId: string) {
  const [batchResult, handoffResult] = await Promise.all([
    supabaseAdmin
      .from("batches")
      .select("batch_id, status, gmo_status")
      .eq("batch_id", batchId)
      .maybeSingle(),
    supabaseAdmin
      .from("handoffs")
      .select("*")
      .eq("batch_id", batchId)
      .order("handed_off_at", { ascending: true }),
  ]);
  if (batchResult.error) {
    throw new DistributionSyncError("database_read", `Batch lookup failed: ${batchResult.error.message}`, 503);
  }
  if (!batchResult.data) {
    throw new DistributionSyncError("database_read", "The batch does not exist in Supabase.", 404);
  }
  if (handoffResult.error) {
    throw new DistributionSyncError(
      "database_read",
      `Supply-chain history lookup failed: ${handoffResult.error.message}`,
      503,
    );
  }
  return {
    batch: batchResult.data as DatabaseBatch,
    handoffs: (handoffResult.data ?? []) as DatabaseHandoff[],
  };
}

function compareState(
  chain: VerifiedChainState,
  database: Awaited<ReturnType<typeof readDatabaseState>>,
) {
  const mismatches: string[] = [];
  if (database.batch.status !== chain.databaseTargetStatus) {
    mismatches.push(`Batch status is ${database.batch.status}; expected ${chain.databaseTargetStatus}.`);
  }

  for (const event of chain.events) {
    const rows = database.handoffs.filter(
      (row) => row.tx_hash?.toLowerCase() === event.transactionHash.toLowerCase(),
    );
    if (rows.length !== 1) {
      mismatches.push(
        rows.length === 0
          ? `${event.type} ${event.transactionHash} is missing from Supabase.`
          : `${event.type} ${event.transactionHash} has duplicate Supabase rows.`,
      );
      continue;
    }
    const row = rows[0];
    if (row.distributor_id !== event.distributorId) mismatches.push(`${event.type} owner differs from the chain sender.`);
    if (row.from_party !== event.fromParty) mismatches.push(`${event.type} origin differs from chain.`);
    if (row.to_party !== event.toParty) mismatches.push(`${event.type} destination differs from chain.`);
    if (row.location !== event.location) mismatches.push(`${event.type} location differs from chain.`);
    if (row.condition !== event.condition) mismatches.push(`${event.type} condition differs from chain.`);
    if (row.transport_method !== event.transportMethod) mismatches.push(`${event.type} transport differs from chain.`);
    if (!sameInstant(row.handed_off_at, event.timestamp)) mismatches.push(`${event.type} timestamp differs from chain.`);
  }
  return mismatches;
}

export async function inspectDistributionSync(
  batchId: string,
  profile: DistributorProfile,
): Promise<DistributionSyncState> {
  const [blockchain, database] = await Promise.all([
    readVerifiedChainState(batchId, profile),
    readDatabaseState(batchId),
  ]);
  const mismatches = compareState(blockchain, database);
  return { batchId, synchronized: mismatches.length === 0, mismatches, blockchain, database };
}

export async function synchronizeDistribution(batchId: string, profile: DistributorProfile) {
  const before = await inspectDistributionSync(batchId, profile);
  if (!before.blockchain.events.some((event) => sameAddress(event.sender, profile.wallet_address))) {
    throw new DistributionSyncError(
      "authorization",
      "No confirmed handoff or delivery by the signed-in Distributor was found for this batch.",
      403,
    );
  }

  for (const event of before.blockchain.events) {
    const matchingRows = before.database.handoffs.filter(
      (row) => row.tx_hash?.toLowerCase() === event.transactionHash.toLowerCase(),
    );
    if (matchingRows.length > 1) {
      throw new DistributionSyncError(
        "verification",
        `Duplicate rows already exist for ${event.transactionHash}; automatic synchronization stopped.`,
        409,
      );
    }
    const payload = {
      batch_id: batchId,
      distributor_id: event.distributorId,
      from_party: event.fromParty,
      to_party: event.toParty,
      location: event.location,
      condition: event.condition,
      transport_method: event.transportMethod,
      tx_hash: event.transactionHash,
      handed_off_at: event.timestamp,
    };
    const existing = matchingRows[0];
    const write = existing
      ? await supabaseAdmin.from("handoffs").update(payload).eq("id", existing.id).select("*").single()
      : await supabaseAdmin
          .from("handoffs")
          .upsert(
            { id: stableEventId(event.type, event.transactionHash), ...payload },
            { onConflict: "id" },
          )
          .select("*")
          .single();
    if (write.error || !write.data) {
      throw new DistributionSyncError(
        "database_write",
        `${event.type} synchronization failed: ${write.error?.message ?? "no row was returned"}`,
        503,
      );
    }
  }

  const batchWrite = await supabaseAdmin
    .from("batches")
    .update({ status: before.blockchain.databaseTargetStatus })
    .eq("batch_id", batchId)
    .select("batch_id, status, gmo_status")
    .single();
  if (batchWrite.error || !batchWrite.data) {
    throw new DistributionSyncError(
      "database_write",
      `Batch synchronization failed: ${batchWrite.error?.message ?? "no row was returned"}`,
      503,
    );
  }

  const database = await readDatabaseState(batchId);
  const mismatches = compareState(before.blockchain, database);
  if (mismatches.length > 0) {
    throw new DistributionSyncError(
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
  } satisfies DistributionSyncState;
}

