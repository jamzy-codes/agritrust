"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  ShieldCheck,
  UserCheck,
  UserX,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import {
  complianceRegistryContract,
  supplyChainLedgerContract,
} from "@/lib/contracts";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

interface ApplicationItem {
  credentialId: string;
  userId: string;
  licenseNumber: string;
  certifyingBody: string;
  documentUrl?: string;
  submittedAt: string;
  fullName: string;
  email: string;
  role: UserRole;
  walletAddress: string | null;
}

export default function RegulatorApprovalsPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  const [regulatorUserId, setRegulatorUserId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeApp, setActiveApp] = useState<ApplicationItem | null>(null);
  const [statusStage, setStatusStage] = useState<
    "idle" | "wallet_pending" | "confirming_onchain" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  async function fetchPendingApplications() {
    setIsLoading(true);
    try {
      const { data: creds, error: credError } = await supabase
        .from("credentials")
        .select("*")
        .eq("status", "pending");

      if (credError || !creds || creds.length === 0) {
        setApplications([]);
        setIsLoading(false);
        return;
      }

      const userIds = creds.map((c) => c.user_id);
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, email, role, wallet_address, status")
        .in("id", userIds);

      const userMap = new Map(users?.map((u) => [u.id, u]));

      const items: ApplicationItem[] = creds.map((c) => {
        const u = userMap.get(c.user_id);
        return {
          credentialId: c.id,
          userId: c.user_id,
          licenseNumber: c.license_number || "N/A",
          certifyingBody: c.certifying_body || "N/A",
          documentUrl: c.document_url,
          submittedAt: c.submitted_at,
          fullName: u?.full_name || "Unknown Applicant",
          email: u?.email || "",
          role: (u?.role as UserRole) || "INSPECTOR",
          walletAddress: u?.wallet_address || null,
        };
      });

      setApplications(items);
    } catch (err) {
      console.error("Error fetching pending applications:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Role Guard & User Session Check
  useEffect(() => {
    async function loadRegulatorSession() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.push("/login");
        return;
      }
      setRegulatorUserId(userData.user.id);

      const { data: userProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (userProfile?.role !== "REGULATOR") {
        router.push("/dashboard");
        return;
      }

      fetchPendingApplications();
    }
    loadRegulatorSession();
  }, [router]);

  // Handle On-Chain Approval Confirmation
  useEffect(() => {
    if (isConfirmed && txHash && statusStage === "confirming_onchain" && activeApp) {
      async function updateApprovedState() {
        if (!activeApp) return;
        try {
          const nowIso = new Date().toISOString();

          const hashSnippet = txHash ? `${txHash.slice(0, 10)}...` : "";

          // 1. Update public.credentials -> status = 'approved'
          const { error: credErr } = await supabase
            .from("credentials")
            .update({
              status: "approved",
              reviewed_by: regulatorUserId,
              reviewed_at: nowIso,
            })
            .eq("id", activeApp.credentialId);

          if (credErr) {
            throw new Error(
              `Approved on-chain (tx: ${hashSnippet}), but failed to update credentials record: ${credErr.message}. Please retry database update.`
            );
          }

          // 2. Update public.users -> status = 'active'
          const { error: userErr } = await supabase
            .from("users")
            .update({ status: "active" })
            .eq("id", activeApp.userId);

          if (userErr) {
            throw new Error(
              `Approved on-chain (tx: ${hashSnippet}), but failed to update user profile record: ${userErr.message}. Please retry database update.`
            );
          }

          setStatusStage("success");
          setApplications((prev) =>
            prev.filter((a) => a.credentialId !== activeApp.credentialId)
          );
        } catch (err: unknown) {
          console.error("Database approval update error:", err);
          const message = err instanceof Error ? err.message : String(err);
          setErrorMessage(message);
          setStatusStage("error");
        }
      }
      updateApprovedState();
    }
  }, [isConfirmed, txHash, statusStage, activeApp, regulatorUserId]);

  async function handleApprove(app: ApplicationItem) {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (!app.walletAddress) {
      setErrorMessage("Applicant does not have a wallet address linked.");
      setStatusStage("error");
      return;
    }

    setActiveApp(app);
    setErrorMessage("");
    setStatusStage("wallet_pending");

    try {
      let hash: `0x${string}`;
      const targetAddress = app.walletAddress as `0x${string}`;

      if (app.role === "INSPECTOR") {
        hash = await writeContractAsync({
          address: complianceRegistryContract.address,
          abi: complianceRegistryContract.abi,
          functionName: "addInspector",
          args: [targetAddress],
        });
      } else if (app.role === "DISTRIBUTOR") {
        hash = await writeContractAsync({
          address: supplyChainLedgerContract.address,
          abi: supplyChainLedgerContract.abi,
          functionName: "addDistributor",
          args: [targetAddress],
        });
      } else {
        throw new Error(`Role ${app.role} cannot be approved via contract on-chain.`);
      }

      setTxHash(hash);
      setStatusStage("confirming_onchain");
    } catch (err: unknown) {
      console.error("Approve contract error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setStatusStage("error");

      if (
        message.includes("Not a regulator") ||
        message.includes("onlyRegulator") ||
        message.includes("Not a Regulator")
      ) {
        setErrorMessage(
          "Your connected wallet is not the authorized Regulator contract admin address."
        );
      } else if (
        message.includes("User rejected") ||
        message.includes("user rejected")
      ) {
        setErrorMessage("Transaction was rejected in your wallet.");
      } else {
        setErrorMessage(`Approval transaction failed: ${message}`);
      }
    }
  }

  async function handleReject(app: ApplicationItem) {
    try {
      const nowIso = new Date().toISOString();

      // 1. Update public.credentials -> status = 'rejected'
      const { error: credErr } = await supabase
        .from("credentials")
        .update({
          status: "rejected",
          reviewed_by: regulatorUserId,
          reviewed_at: nowIso,
        })
        .eq("id", app.credentialId);

      if (credErr) {
        throw new Error(`Failed to update credentials status: ${credErr.message}`);
      }

      // 2. Update public.users -> status = 'rejected'
      const { error: userErr } = await supabase
        .from("users")
        .update({ status: "rejected" })
        .eq("id", app.userId);

      if (userErr) {
        throw new Error(`Failed to update user status: ${userErr.message}`);
      }

      // Only remove row from UI if both database updates succeeded
      setApplications((prev) =>
        prev.filter((a) => a.credentialId !== app.credentialId)
      );
    } catch (err: unknown) {
      console.error("Reject error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Rejection failed: ${message}`);
      setStatusStage("error");
    }
  }

  return (
    <div className="px-8 py-8 pb-16">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent-purple" />
          <span className="text-xs font-bold tracking-widest text-accent-purple">
            REGULATOR CONTROL CENTER
          </span>
        </div>
        <h1
          className="text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Pending Approvals
        </h1>
        <p className="mt-1 text-sm text-agri-muted">
          Review credentials for Inspectors and Distributors and authorize them on the blockchain allowlist.
        </p>
      </header>

      {statusStage === "success" && txHash ? (
        <div className="mb-6 rounded-xl border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-accent-green space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            Applicant Successfully Authorized On-Chain & Activated!
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span>On-Chain Tx Hash:</span>
            <a
              href={`https://amoy.polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline hover:text-accent-green flex items-center gap-1"
            >
              {txHash.slice(0, 12)}...{txHash.slice(-8)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : null}

      {statusStage === "error" && errorMessage ? (
        <div className="mb-6 rounded-xl border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 glass rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
          <p className="mt-3 text-sm text-agri-muted">Loading pending applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 glass rounded-xl text-center">
          <FileCheck className="h-12 w-12 text-agri-muted mb-3" />
          <h3 className="text-lg font-semibold text-agri-text">No Pending Applications</h3>
          <p className="mt-1 text-sm text-agri-muted">
            All submitted credentials have been reviewed. New applications will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const isInspector = app.role === "INSPECTOR";
            const roleBadgeColor = isInspector
              ? "bg-accent-blue/20 text-accent-blue border-accent-blue/30"
              : "bg-accent-amber/20 text-accent-amber border-accent-amber/30";

            const isProcessingThis =
              activeApp?.credentialId === app.credentialId &&
              (statusStage === "wallet_pending" || statusStage === "confirming_onchain");

            const hasNoWallet = !app.walletAddress;

            return (
              <div
                key={app.credentialId}
                className={`rounded-xl glass p-6 transition-all ${hasNoWallet ? "opacity-70 border-agri-border" : "border-agri-border hover:border-agri-border-focus"
                  }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg font-bold text-agri-text">{app.fullName}</h2>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${roleBadgeColor}`}
                      >
                        {app.role}
                      </span>
                    </div>
                    <p className="text-sm text-agri-muted">{app.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isConnected ? (
                      <button
                        className="flex items-center gap-2 rounded-xl bg-accent-purple px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        type="button"
                        onClick={() => openConnectModal?.()}
                      >
                        <Wallet className="h-4 w-4" />
                        Connect Regulator Wallet
                      </button>
                    ) : (
                      <>
                        <button
                          className="flex items-center gap-2 rounded-xl bg-accent-green px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
                          type="button"
                          disabled={hasNoWallet || isProcessingThis}
                          onClick={() => handleApprove(app)}
                        >
                          {isProcessingThis ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {statusStage === "wallet_pending"
                                ? "Confirm in Wallet..."
                                : "Authorizing On-Chain..."}
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4" />
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          className="flex items-center gap-2 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-2 text-sm font-semibold text-accent-red transition-all hover:bg-accent-red/20 disabled:opacity-40"
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleReject(app)}
                        >
                          <UserX className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-agri-border bg-agri-raised p-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <span className="block text-xs text-agri-muted">License Number</span>
                    <span className="font-mono text-xs font-semibold text-agri-text">
                      {app.licenseNumber}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-agri-muted">Certifying Body</span>
                    <span className="text-xs font-semibold text-agri-text">
                      {app.certifyingBody}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-agri-muted">Submitted Date</span>
                    <span className="flex items-center gap-1 text-xs text-agri-text">
                      <Clock className="h-3 w-3 text-agri-muted" />
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-agri-muted">Wallet Address</span>
                    <span className="font-mono text-xs text-agri-text">
                      {app.walletAddress ? (
                        `${app.walletAddress.slice(0, 8)}...${app.walletAddress.slice(-6)}`
                      ) : (
                        <span className="text-accent-amber font-sans text-xs">
                          Waiting for wallet connection
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {app.documentUrl ? (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <FileText className="h-3.5 w-3.5 text-agri-muted" />
                    <a
                      href={app.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-purple underline hover:text-accent-purple/80"
                    >
                      View Uploaded Credential Document
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
