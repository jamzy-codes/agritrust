import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, getAddress, http, parseAbi } from "viem";
import { polygonAmoy } from "viem/chains";

nextEnv.loadEnvConfig(process.cwd());

const batchId = "AGT-6816";
const PRODUCE_REGISTRY_ADDRESS = getAddress(process.env.NEXT_PUBLIC_PRODUCE_REGISTRY_CONTRACT_ADDRESS);
const SUPPLY_CHAIN_LEDGER_ADDRESS = getAddress(process.env.NEXT_PUBLIC_SUPPLY_CHAIN_LEDGER_CONTRACT_ADDRESS);
const produceRegistryAbi = parseAbi([
  "function getBatch(string) view returns ((string batchId,string farmId,string cropType,uint256 quantityKg,string seedVariety,bool isGMOFree,uint256 registeredAt,uint8 status,address registeredBy))",
]);
const supplyChainLedgerAbi = parseAbi([
  "function isApprovedDistributor(address) view returns (bool)",
  "function getCurrentCustodian(string) view returns (address)",
  "function getHandoffHistory(string) view returns ((string batchId,string fromParty,string toParty,address fromWallet,address toWallet,string location,string conditionOnHandoff,string transportMethod,uint256 quantityKg,uint256 timestamp)[])",
  "function recordDelivery(string batchId,string location)",
]);
const approvedDistributor = getAddress("0xf3d6B33d0559e2aAAc542519E769e2d93ec8fe01");
const unapprovedWallet = getAddress("0x000000000000000000000000000000000000dEaD");
const client = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.NEXT_PUBLIC_AMOY_RPC_URL),
});

const readBatch = () => client.readContract({
  address: PRODUCE_REGISTRY_ADDRESS,
  abi: produceRegistryAbi,
  functionName: "getBatch",
  args: [batchId],
});

const [beforeBatch, approved, custodian, history] = await Promise.all([
  readBatch(),
  client.readContract({
    address: SUPPLY_CHAIN_LEDGER_ADDRESS,
    abi: supplyChainLedgerAbi,
    functionName: "isApprovedDistributor",
    args: [approvedDistributor],
  }),
  client.readContract({
    address: SUPPLY_CHAIN_LEDGER_ADDRESS,
    abi: supplyChainLedgerAbi,
    functionName: "getCurrentCustodian",
    args: [batchId],
  }),
  client.readContract({
    address: SUPPLY_CHAIN_LEDGER_ADDRESS,
    abi: supplyChainLedgerAbi,
    functionName: "getHandoffHistory",
    args: [batchId],
  }),
]);

if (!approved || Number(beforeBatch.status) !== 2 || history.length === 0) {
  throw new Error("AGT-6816 is not in the expected read-only delivery simulation state.");
}
if (custodian.toLowerCase() !== approvedDistributor.toLowerCase()) {
  throw new Error("The approved test Distributor is not AGT-6816's current custodian.");
}

await client.simulateContract({
  account: approvedDistributor,
  address: SUPPLY_CHAIN_LEDGER_ADDRESS,
  abi: supplyChainLedgerAbi,
  functionName: "recordDelivery",
  args: [batchId, "Read-only E2E market simulation"],
});

let unauthorizedDeliveryRejected = false;
try {
  await client.simulateContract({
    account: unapprovedWallet,
    address: SUPPLY_CHAIN_LEDGER_ADDRESS,
    abi: supplyChainLedgerAbi,
    functionName: "recordDelivery",
    args: [batchId, "Unauthorized read-only simulation"],
  });
} catch {
  unauthorizedDeliveryRejected = true;
}

let missingBatchRejected = false;
try {
  await client.simulateContract({
    account: approvedDistributor,
    address: SUPPLY_CHAIN_LEDGER_ADDRESS,
    abi: supplyChainLedgerAbi,
    functionName: "recordDelivery",
    args: ["AGT-NOT-A-REAL-BATCH", "Read-only simulation"],
  });
} catch {
  missingBatchRejected = true;
}

const afterBatch = await readBatch();
if (Number(afterBatch.status) !== Number(beforeBatch.status)) {
  throw new Error("A read-only simulation unexpectedly changed blockchain state.");
}
if (!unauthorizedDeliveryRejected || !missingBatchRejected) {
  throw new Error("A negative delivery simulation did not revert as expected.");
}

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const serviceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const anonymousProbes = {};
for (const [table, columns] of Object.entries({
  users: "id,email,full_name,role,wallet_address,status",
  batches: "batch_id,status,registered_by",
  farms: "id,owner_id,farm_name,location",
  inspections: "id,batch_id,inspector_id,inspected_at",
  handoffs: "id,batch_id,distributor_id,tx_hash",
  credentials: "id,user_id,status",
})) {
  const result = await anon.from(table).select(columns, { count: "exact" }).limit(1);
  anonymousProbes[table] = {
    rowVisible: Boolean(result.data?.length),
    count: result.count,
    denied: Boolean(result.error),
    errorCode: result.error?.code ?? null,
  };
}

const policyProbe = await serviceRole
  .from("pg_policies")
  .select("schemaname,tablename,policyname,roles,cmd,qual,with_check")
  .limit(1);
const alertsColumnProbe = await serviceRole
  .from("users")
  .select("last_viewed_alerts_at", { head: true, count: "exact" });
const anonymousReadStateRpc = await anon.rpc("get_my_last_viewed_alerts_at");

console.log(JSON.stringify({
  blockchain: {
    chainId: await client.getChainId(),
    produceRegistry: PRODUCE_REGISTRY_ADDRESS,
    supplyChainLedger: SUPPLY_CHAIN_LEDGER_ADDRESS,
    batchId,
    statusBefore: Number(beforeBatch.status),
    statusAfter: Number(afterBatch.status),
    custodian,
    deliverySimulationSucceeded: true,
    unauthorizedDeliveryRejected,
    missingBatchRejected,
    stateChangingTransactionSent: false,
  },
  anonymousSupabaseAccess: anonymousProbes,
  policyIntrospection: {
    accessibleThroughPostgrest: !policyProbe.error,
    errorCode: policyProbe.error?.code ?? null,
    errorMessage: policyProbe.error?.message ?? null,
  },
  anonymousNotificationRpc: {
    accessible: !anonymousReadStateRpc.error,
    errorCode: anonymousReadStateRpc.error?.code ?? null,
  },
  notificationReadStateSchema: {
    columnExists: !alertsColumnProbe.error,
    errorCode: alertsColumnProbe.error?.code ?? null,
    errorMessage: alertsColumnProbe.error?.message ?? null,
  },
}, null, 2));
