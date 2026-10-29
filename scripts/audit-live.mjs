import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, getAddress, http, parseAbi } from "viem";
import { polygonAmoy } from "viem/chains";

nextEnv.loadEnvConfig(process.cwd());

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.NEXT_PUBLIC_AMOY_RPC_URL),
});
const produceRegistry = getAddress(
  process.env.NEXT_PUBLIC_PRODUCE_REGISTRY_CONTRACT_ADDRESS,
);
const supplyChainLedger = getAddress(
  process.env.NEXT_PUBLIC_SUPPLY_CHAIN_LEDGER_CONTRACT_ADDRESS,
);
const batchAbi = parseAbi([
  "function getBatch(string) view returns ((string batchId,string farmId,string cropType,uint256 quantityKg,string seedVariety,bool isGMOFree,uint256 registeredAt,uint8 status,address registeredBy))",
]);
const ledgerAbi = parseAbi([
  "function getHandoffHistory(string) view returns ((string batchId,string fromParty,string toParty,address fromWallet,address toWallet,string location,string conditionOnHandoff,string transportMethod,uint256 quantityKg,uint256 timestamp)[])",
  "function getCurrentCustodian(string) view returns (address)",
  "function isApprovedDistributor(address) view returns (bool)",
]);

const [block, batch, history, custodian, approved, receipt] = await Promise.all([
  publicClient.getBlockNumber(),
  publicClient.readContract({
    address: produceRegistry,
    abi: batchAbi,
    functionName: "getBatch",
    args: ["AGT-6816"],
  }),
  publicClient.readContract({
    address: supplyChainLedger,
    abi: ledgerAbi,
    functionName: "getHandoffHistory",
    args: ["AGT-6816"],
  }),
  publicClient.readContract({
    address: supplyChainLedger,
    abi: ledgerAbi,
    functionName: "getCurrentCustodian",
    args: ["AGT-6816"],
  }),
  publicClient.readContract({
    address: supplyChainLedger,
    abi: ledgerAbi,
    functionName: "isApprovedDistributor",
    args: ["0xf3d6B33d0559e2aAAc542519E769e2d93ec8fe01"],
  }),
  publicClient.getTransactionReceipt({
    hash: "0xe850b63b09a93f5d7cc7cb6eca0b96771a68b86cc3de4ab558d14d0cc189d8f1",
  }),
]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const [dbBatch, handoffs, inspections, certificates] = await Promise.all([
  supabase.from("batches").select("*").eq("batch_id", "AGT-6816"),
  supabase.from("handoffs").select("*").eq("batch_id", "AGT-6816"),
  supabase.from("inspections").select("*").eq("batch_id", "AGT-6816"),
  supabase.from("certificates").select("*").eq("batch_id", "AGT-6816"),
]);
const schemaResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
  headers: {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
});
const openApi = await schemaResponse.json();

console.log(JSON.stringify({
  chain: {
    block: block.toString(),
    addresses: { produceRegistry, supplyChainLedger },
    batch: {
      ...batch,
      quantityKg: batch.quantityKg.toString(),
      status: Number(batch.status),
      registeredAt: batch.registeredAt.toString(),
    },
    handoffs: history.map((row) => ({
      ...row,
      quantityKg: row.quantityKg.toString(),
      timestamp: row.timestamp.toString(),
    })),
    custodian,
    approved,
    receipt: {
      status: receipt.status,
      blockNumber: receipt.blockNumber.toString(),
      from: receipt.from,
      to: receipt.to,
      logs: receipt.logs.map((log) => ({
        address: log.address,
        topics: log.topics,
      })),
    },
  },
  database: {
    batch: { data: dbBatch.data, error: dbBatch.error?.message },
    handoffs: { data: handoffs.data, error: handoffs.error?.message },
    inspections: { data: inspections.data, error: inspections.error?.message },
    certificates: { data: certificates.data, error: certificates.error?.message },
    schema: Object.fromEntries(
      ["users", "batches", "handoffs", "inspections"].map((name) => [
        name,
        openApi.definitions?.[name] ?? null,
      ]),
    ),
  },
}, null, 2));
