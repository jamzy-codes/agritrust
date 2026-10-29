import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, getAddress, http, parseAbi } from "viem";
import { polygonAmoy } from "viem/chains";

nextEnv.loadEnvConfig(process.cwd());

const batchId = "AGT-6816";
const transactionHash = "0xe850b63b09a93f5d7cc7cb6eca0b96771a68b86cc3de4ab558d14d0cc189d8f1";
const client = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.NEXT_PUBLIC_AMOY_RPC_URL),
});
const produceRegistry = getAddress(process.env.NEXT_PUBLIC_PRODUCE_REGISTRY_CONTRACT_ADDRESS);
const supplyChainLedger = getAddress(process.env.NEXT_PUBLIC_SUPPLY_CHAIN_LEDGER_CONTRACT_ADDRESS);
const produceAbi = parseAbi([
  "function getBatch(string) view returns ((string batchId,string farmId,string cropType,uint256 quantityKg,string seedVariety,bool isGMOFree,uint256 registeredAt,uint8 status,address registeredBy))",
]);
const ledgerAbi = parseAbi([
  "function getHandoffHistory(string) view returns ((string batchId,string fromParty,string toParty,address fromWallet,address toWallet,string location,string conditionOnHandoff,string transportMethod,uint256 quantityKg,uint256 timestamp)[])",
  "function isApprovedDistributor(address) view returns (bool)",
]);

const [chainId, batch, history, receipt] = await Promise.all([
  client.getChainId(),
  client.readContract({ address: produceRegistry, abi: produceAbi, functionName: "getBatch", args: [batchId] }),
  client.readContract({ address: supplyChainLedger, abi: ledgerAbi, functionName: "getHandoffHistory", args: [batchId] }),
  client.getTransactionReceipt({ hash: transactionHash }),
]);

if (chainId !== 80002 || Number(batch.status) !== 2 || history.length !== 1) {
  throw new Error("Live Polygon Amoy batch state is not the expected single-handoff IN_TRANSIT state.");
}
const handoff = history[0];
if (
  receipt.status !== "success" ||
  !receipt.to ||
  receipt.to.toLowerCase() !== supplyChainLedger.toLowerCase() ||
  receipt.from.toLowerCase() !== handoff.toWallet.toLowerCase()
) {
  throw new Error("The confirmed transaction receipt does not match the authoritative handoff.");
}
const approved = await client.readContract({
  address: supplyChainLedger,
  abi: ledgerAbi,
  functionName: "isApprovedDistributor",
  args: [handoff.toWallet],
});
if (!approved) throw new Error("The handoff sender is not currently an approved Distributor.");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: rows, error: rowsError } = await supabase
  .from("handoffs")
  .select("*")
  .eq("batch_id", batchId)
  .eq("tx_hash", transactionHash);
if (rowsError || rows?.length !== 1) {
  throw new Error(`Expected exactly one existing handoff row: ${rowsError?.message ?? rows?.length}`);
}
const existing = rows[0];
const { data: profile, error: profileError } = await supabase
  .from("users")
  .select("id, role, status, wallet_address")
  .eq("id", existing.distributor_id)
  .single();
if (
  profileError ||
  !profile ||
  profile.role !== "DISTRIBUTOR" ||
  profile.status !== "active" ||
  profile.wallet_address?.toLowerCase() !== handoff.toWallet.toLowerCase()
) {
  throw new Error(`The database Distributor profile does not match the chain sender: ${profileError?.message ?? "mismatch"}`);
}

const authoritativeTimestamp = new Date(Number(handoff.timestamp) * 1_000).toISOString();
const { data: handoffWrite, error: handoffWriteError } = await supabase
  .from("handoffs")
  .update({
    from_party: handoff.fromParty,
    to_party: handoff.toParty,
    location: handoff.location,
    condition: handoff.conditionOnHandoff,
    transport_method: handoff.transportMethod,
    handed_off_at: authoritativeTimestamp,
  })
  .eq("id", existing.id)
  .eq("tx_hash", transactionHash)
  .select("*")
  .single();
if (handoffWriteError || !handoffWrite) {
  throw new Error(`Handoff read-back failed: ${handoffWriteError?.message ?? "no row"}`);
}

let { data: batchWrite, error: batchWriteError } = await supabase
  .from("batches")
  .update({ status: "IN_TRANSIT" })
  .eq("batch_id", batchId)
  .eq("status", "CERTIFIED")
  .select("batch_id, status, gmo_status, registered_at")
  .maybeSingle();
if (batchWriteError) throw new Error(`Batch reconciliation failed: ${batchWriteError.message}`);
if (!batchWrite) {
  const current = await supabase
    .from("batches")
    .select("batch_id, status, gmo_status, registered_at")
    .eq("batch_id", batchId)
    .single();
  if (current.error || current.data?.status !== "IN_TRANSIT") {
    throw new Error(`Guarded batch update modified no row: ${current.error?.message ?? current.data?.status}`);
  }
  batchWrite = current.data;
}

const [{ data: verifiedBatch, error: verifiedBatchError }, { data: verifiedHandoffs, error: verifiedHandoffsError }] =
  await Promise.all([
    supabase.from("batches").select("*").eq("batch_id", batchId).single(),
    supabase.from("handoffs").select("*").eq("batch_id", batchId).eq("tx_hash", transactionHash),
  ]);
if (
  verifiedBatchError ||
  verifiedHandoffsError ||
  verifiedBatch?.status !== "IN_TRANSIT" ||
  verifiedHandoffs?.length !== 1 ||
  new Date(verifiedHandoffs[0].handed_off_at).getTime() !== new Date(authoritativeTimestamp).getTime()
) {
  throw new Error("Post-write verification did not match the authoritative chain state.");
}

console.log(JSON.stringify({
  batch: {
    batch_id: verifiedBatch.batch_id,
    status: verifiedBatch.status,
    gmo_status: verifiedBatch.gmo_status,
    registered_at: verifiedBatch.registered_at,
  },
  handoff: {
    id: verifiedHandoffs[0].id,
    tx_hash: verifiedHandoffs[0].tx_hash,
    handed_off_at: verifiedHandoffs[0].handed_off_at,
  },
  preserved: {
    inspectionRowsUntouched: true,
    handoffIdentityPreserved: verifiedHandoffs[0].id === existing.id,
  },
}, null, 2));
