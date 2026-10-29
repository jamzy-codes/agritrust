"use client";

import { Code2, Copy, FileCheck, ShieldCheck, Truck } from "lucide-react";
import { useAccount, useChainId } from "wagmi";

import {
  COMPLIANCE_REGISTRY_ADDRESS,
  PRODUCE_REGISTRY_ADDRESS,
  SUPPLY_CHAIN_LEDGER_ADDRESS,
} from "@/lib/contracts";

const contracts = [
  {
    name: "ProduceRegistry",
    description: "Registers and stores batch data on-chain",
    address: PRODUCE_REGISTRY_ADDRESS,
    icon: FileCheck,
    iconColor: "text-accent-green bg-accent-green/20",
  },
  {
    name: "ComplianceRegistry",
    description: "Stores inspection results and biosafety certificates",
    address: COMPLIANCE_REGISTRY_ADDRESS,
    icon: ShieldCheck,
    iconColor: "text-accent-blue bg-accent-blue/20",
  },
  {
    name: "SupplyChainLedger",
    description: "Records custody handoffs between supply chain actors",
    address: SUPPLY_CHAIN_LEDGER_ADDRESS,
    icon: Truck,
    iconColor: "text-accent-amber bg-accent-amber/20",
  },
];

export default function SmartContractsPage() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const configuredContracts = contracts.filter((contract) => Boolean(contract.address));
  const syncStatus = isConnected && configuredContracts.length === contracts.length ? "Live" : "Pending config";
  const networkLabel = chainId === 80002 ? "Polygon Amoy Testnet" : chainId ? `Chain ${chainId}` : "Wallet disconnected";

  return (
    <div className="pb-10">
      <header className="mb-6 px-8 pt-8">
        <div className="mb-3 flex items-center gap-2">
          <Code2 className="h-4 w-4 text-accent-blue" />
          <span className="text-xs font-bold tracking-widest text-accent-blue">
            DEPLOYED CONTRACTS
          </span>
        </div>
        <h1
          className="text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Smart Contracts
        </h1>
        <p className="mt-1 text-agri-muted">
          The on-chain infrastructure powering AgriTrust.
        </p>
      </header>

      <div className="mx-8 mb-6 grid gap-4 lg:grid-cols-3">
        {contracts.map((contract) => {
          const Icon = contract.icon;
          const addressValue = contract.address || "Not configured in environment";

          return (
            <div
              key={contract.name}
              className="rounded-xl border border-agri-border bg-agri-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${contract.iconColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-agri-text">
                    {contract.name}
                  </h2>
                  <p className="mt-1 text-sm text-agri-muted">
                    {contract.description}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${contract.address
                    ? "bg-accent-green/20 text-accent-green"
                    : "bg-accent-amber/20 text-accent-amber"
                    }`}
                >
                  {contract.address ? "ACTIVE" : "MISSING"}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs text-agri-muted">Contract address</p>
                <p className="mt-1 break-all font-mono text-xs text-accent-cyan">
                  {addressValue} <Copy className="ml-1 inline h-3 w-3" />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-8 flex flex-col gap-4 rounded-xl border border-agri-border bg-agri-surface p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-agri-text">Network</p>
          <p className="mt-1 text-xs text-agri-muted">{networkLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${syncStatus === "Live" ? "bg-accent-green animate-pulse" : "bg-accent-amber"
              }`}
          />
          <div>
            <p className="text-xs font-semibold text-agri-text">Sync status</p>
            <p className="text-xs text-agri-muted">{syncStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
