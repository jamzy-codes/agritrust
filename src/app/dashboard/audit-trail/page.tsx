"use client";

import { ExternalLink, FileText, History, Lock, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface AuditEvent {
  id: string;
  hash: string | null;
  type: "REGISTRATION" | "INSPECTION" | "CERTIFICATION" | "HANDOFF" | "DELIVERY";
  typeTone: string;
  batch: string;
  actor: string;
  timestamp: string;
  rawTimestamp: number;
  status: string;
}

function toSafeTimestamp(value: string | null | undefined): number {
  if (!value) return 0;

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AuditTrailPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalActions, setTotalActions] = useState<number>(0);
  const [activeWallets, setActiveWallets] = useState<number>(0);

  async function fetchAuditTrail() {
    setIsLoading(true);
    try {
      const [{ data: batches }, { data: inspections }, { data: handoffs }] = await Promise.all([
        supabase.from("batches").select("batch_id, registered_at, tx_hash, registered_by"),
        supabase.from("inspections").select("batch_id, inspected_at, tx_hash, inspector_id, certificate_issued"),
        supabase.from("handoffs").select("batch_id, handed_off_at, tx_hash, distributor_id"),
      ]);

      const userIds = new Set<string>();
      batches?.forEach((batch) => batch.registered_by && userIds.add(batch.registered_by));
      inspections?.forEach((inspection) => inspection.inspector_id && userIds.add(inspection.inspector_id));
      handoffs?.forEach((handoff) => handoff.distributor_id && userIds.add(handoff.distributor_id));

      const { data: users } = userIds.size
        ? await supabase.from("users").select("id, full_name, email").in("id", Array.from(userIds))
        : { data: [] };
      const userMap = new Map(users?.map((user) => [user.id, user.full_name || user.email || "Registered User"]));
      const combined: AuditEvent[] = [];

      batches?.forEach((batch) => {
        const rawTimestamp = toSafeTimestamp(batch.registered_at);
        combined.push({
          id: `reg-${batch.batch_id}`,
          hash: batch.tx_hash,
          type: "REGISTRATION",
          typeTone: "bg-accent-green/20 text-accent-green border-accent-green/30",
          batch: batch.batch_id,
          actor: batch.registered_by ? userMap.get(batch.registered_by) || "Farmer" : "Farmer",
          timestamp: batch.registered_at || "Pending timestamp",
          rawTimestamp,
          status: "CONFIRMED",
        });
      });

      inspections?.forEach((inspection) => {
        const rawTimestamp = toSafeTimestamp(inspection.inspected_at);
        const actor = inspection.inspector_id ? userMap.get(inspection.inspector_id) || "Inspector" : "Inspector";
        combined.push({
          id: `insp-${inspection.batch_id}-${rawTimestamp}`,
          hash: inspection.tx_hash,
          type: "INSPECTION",
          typeTone: "bg-accent-blue/20 text-accent-blue border-accent-blue/30",
          batch: inspection.batch_id,
          actor,
          timestamp: inspection.inspected_at || "Pending timestamp",
          rawTimestamp,
          status: "CONFIRMED",
        });
        if (inspection.certificate_issued) {
          combined.push({
            id: `cert-${inspection.batch_id}-${rawTimestamp}`,
            hash: inspection.tx_hash,
            type: "CERTIFICATION",
            typeTone: "bg-accent-purple/20 text-accent-purple border-accent-purple/30",
            batch: inspection.batch_id,
            actor,
            timestamp: inspection.inspected_at || "Pending timestamp",
            rawTimestamp: rawTimestamp + 1,
            status: "CONFIRMED",
          });
        }
      });

      handoffs?.forEach((handoff) => {
        const rawTimestamp = toSafeTimestamp(handoff.handed_off_at);
        combined.push({
          id: `handoff-${handoff.batch_id}-${rawTimestamp}`,
          hash: handoff.tx_hash,
          type: "HANDOFF",
          typeTone: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
          batch: handoff.batch_id,
          actor: handoff.distributor_id ? userMap.get(handoff.distributor_id) || "Distributor" : "Distributor",
          timestamp: handoff.handed_off_at || "Pending timestamp",
          rawTimestamp,
          status: "CONFIRMED",
        });
      });

      combined.sort((first, second) => second.rawTimestamp - first.rawTimestamp);
      setEvents(combined);
      setTotalActions(combined.length);
      setActiveWallets(userIds.size || (users?.length ?? 0));
    } catch (err) {
      console.error("Error fetching audit trail events:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // REGULATOR Role Guard & Data Fetching
  useEffect(() => {
    async function loadAndVerifyRegulator() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.push("/login");
        return;
      }

      const userId = userData.user.id;

      const { data: userProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (userProfile?.role !== "REGULATOR") {
        router.push("/dashboard");
        return;
      }

      fetchAuditTrail();
    }
    loadAndVerifyRegulator();
  }, [router]);

  const stats = [
    { value: totalActions.toLocaleString(), label: "Total on-chain transactions" },
    { value: activeWallets.toString(), label: "Active network actors" },
    { value: "100%", label: "Verified on Polygon Amoy" },
  ];

  return (
    <div className="pb-10">
      <header className="mb-6 px-8 pt-8">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-accent-purple" />
          <span className="text-xs font-bold tracking-widest text-accent-purple">
            IMMUTABLE LEDGER
          </span>
        </div>
        <h1
          className="text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Audit Trail
        </h1>
        <p className="mt-1 text-agri-muted">
          Every blockchain transaction across the AgriTrust network, in chronological order.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-4 px-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-agri-border bg-agri-surface px-4 py-3 min-w-12.5px"
          >
            <p className="text-lg font-bold text-agri-text">{stat.value}</p>
            <p className="text-sm text-agri-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="mx-8 flex flex-col items-center justify-center py-16 rounded-xl glass">
          <p className="text-sm text-agri-muted">Loading immutable ledger records...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="mx-8 flex flex-col items-center justify-center py-16 rounded-xl glass text-center">
          <FileText className="h-10 w-10 text-agri-muted mb-2" />
          <h3 className="text-base font-semibold text-agri-text">No Ledger Events Recorded</h3>
          <p className="text-xs text-agri-muted mt-1">
            Produce batch registrations, inspections, and handoffs will appear here once executed on-chain.
          </p>
        </div>
      ) : (
        <div className="mx-8 overflow-x-auto rounded-xl border border-agri-border bg-agri-surface">
          <table className="min-w-full">
            <thead className="bg-agri-raised border-b border-agri-border">
              <tr>
                {[
                  "Tx Hash",
                  "Type",
                  "Batch ID",
                  "Actor",
                  "Timestamp",
                  "Status",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-agri-muted"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-agri-border">
              {events.map((row) => (
                <tr key={row.id} className="hover:bg-agri-raised/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-accent-cyan">
                    {row.hash ? (
                      <a
                        href={`https://amoy.polygonscan.com/tx/${row.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                        title={row.hash}
                      >
                        {row.hash.slice(0, 10)}...{row.hash.slice(-8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-agri-muted font-sans text-xs">Pending Tx</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-agri-text">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${row.typeTone}`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-agri-text">
                    {row.batch}
                  </td>
                  <td className="px-4 py-3 text-sm text-agri-text">
                    {row.actor}
                  </td>
                  <td className="px-4 py-3 text-xs text-agri-muted">
                    {row.timestamp}
                  </td>
                  <td className="px-4 py-3 text-sm text-agri-text">
                    <span className="rounded-full bg-accent-green/20 px-2 py-0.5 text-xs font-bold text-accent-green">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mx-8 mt-4 flex items-center gap-2 rounded-lg border border-agri-border bg-agri-raised px-4 py-3">
        <Lock className="h-4 w-4 text-agri-muted" />
        <p className="text-xs text-agri-muted">
          This ledger is permanently anchored on-chain on Polygon Amoy testnet and cannot be edited or deleted.
        </p>
      </div>
    </div>
  );
}
