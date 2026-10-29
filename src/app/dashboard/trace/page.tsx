"use client";

import {
  Calendar,
  MapPin,
  Package,
  QrCode,
  Route,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MiniTimeline } from "@/components/ui/MiniTimeline";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

interface TraceBatch {
  batchId: string;
  cropType: string;
  quantityKg: number;
  farm: string;
  region: string;
  date: string;
  registeredAt: string | null;
  status: string;
  custody: string;
  stages: Array<"complete" | "current" | "pending">;
}

const statusClassName: Record<string, string> = {
  CERTIFIED: "bg-accent-green/20 text-accent-green",
  "IN TRANSIT": "bg-accent-amber/20 text-accent-amber",
  "AWAITING INSPECTION": "border border-accent-amber bg-transparent text-accent-amber",
  FLAGGED: "bg-accent-red/20 text-accent-red",
  DELIVERED: "bg-accent-green/20 text-accent-green",
};

const statusHoverGlow: Record<string, string> = {
  CERTIFIED: "hover:shadow-[0_0_12px_rgba(34,197,94,0.35)]",
  "IN TRANSIT": "hover:shadow-[0_0_12px_rgba(245,158,11,0.35)]",
  "AWAITING INSPECTION": "hover:shadow-[0_0_12px_rgba(245,158,11,0.35)]",
  FLAGGED: "hover:shadow-[0_0_12px_rgba(239,68,68,0.35)]",
};

const selectClassName =
  "rounded-lg border border-agri-border bg-agri-raised px-3 py-2 text-sm text-agri-text transition-colors focus:border-agri-border-focus focus:outline-none";

export default function TracePage() {
  const [batches, setBatches] = useState<TraceBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cropFilter, setCropFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [filterReferenceTime] = useState(() => Date.now());

  useEffect(() => {
    async function loadBatches() {
      const pendingSearch = window.sessionStorage.getItem("agritrust_dashboard_search");
      if (pendingSearch) {
        setSearch(pendingSearch);
        window.sessionStorage.removeItem("agritrust_dashboard_search");
      }

      setIsLoading(true);
      setLoadError(null);
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw authError ?? new Error("A signed-in user is required.");

        const { data: profile, error: profileError } = await supabase
          .from("users").select("role").eq("id", auth.user.id).single();
        if (profileError) throw profileError;
        const role = profile.role as UserRole;

        let accessibleBatchIds: string[] | null = null;
        if (role === "INSPECTOR") {
          const result = await supabase.from("inspections").select("batch_id").eq("inspector_id", auth.user.id);
          if (result.error) throw result.error;
          accessibleBatchIds = [...new Set((result.data ?? []).map((row) => row.batch_id))];
        } else if (role === "DISTRIBUTOR") {
          const result = await supabase.from("handoffs").select("batch_id").eq("distributor_id", auth.user.id);
          if (result.error) throw result.error;
          accessibleBatchIds = [...new Set((result.data ?? []).map((row) => row.batch_id))];
        }
        if (accessibleBatchIds?.length === 0) { setBatches([]); return; }

        let batchQuery = supabase.from("batches")
          .select("batch_id, registered_by, crop_type, quantity_kg, status, registered_at, farms(farm_name, location)")
          .order("registered_at", { ascending: false });
        if (role === "FARMER") batchQuery = batchQuery.eq("registered_by", auth.user.id);
        else if (role === "CONSUMER") batchQuery = batchQuery.in("status", ["CERTIFIED", "IN_TRANSIT", "DELIVERED"]);
        else if (accessibleBatchIds) batchQuery = batchQuery.in("batch_id", accessibleBatchIds);

        const batchResult = await batchQuery;
        if (batchResult.error) throw batchResult.error;
        const batchIds = (batchResult.data ?? []).map((row) => row.batch_id);
        if (batchIds.length === 0) { setBatches([]); return; }

        const [inspectionResult, handoffResult] = await Promise.all([
          supabase.from("inspections")
            .select("batch_id, certificate_issued, inspected_at")
            .in("batch_id", batchIds).order("inspected_at", { ascending: true }),
          supabase.from("handoffs")
            .select("batch_id, to_party, location, handed_off_at")
            .in("batch_id", batchIds).order("handed_off_at", { ascending: true }),
        ]);
        if (inspectionResult.error) throw inspectionResult.error;
        if (handoffResult.error) throw handoffResult.error;

        const inspectionsByBatch = new Map<string, NonNullable<typeof inspectionResult.data>>();
        for (const row of inspectionResult.data ?? []) {
          inspectionsByBatch.set(row.batch_id, [...(inspectionsByBatch.get(row.batch_id) ?? []), row]);
        }
        const handoffsByBatch = new Map<string, NonNullable<typeof handoffResult.data>>();
        for (const row of handoffResult.data ?? []) {
          handoffsByBatch.set(row.batch_id, [...(handoffsByBatch.get(row.batch_id) ?? []), row]);
        }

        setBatches((batchResult.data ?? []).map((batch) => {
          const farm = Array.isArray(batch.farms) ? batch.farms[0] : batch.farms;
          const inspections = inspectionsByBatch.get(batch.batch_id) ?? [];
          const handoffs = handoffsByBatch.get(batch.batch_id) ?? [];
          const inspected = inspections.length > 0;
          const certified = inspections.some((item) => item.certificate_issued);
          const latestHandoff = handoffs.at(-1);
          const delivered = batch.status === "DELIVERED";
          const status = batch.status === "FLAGGED"
            ? "FLAGGED"
            : delivered
              ? "DELIVERED"
              : latestHandoff
                ? "IN TRANSIT"
                : certified ? "CERTIFIED" : "AWAITING INSPECTION";
          return {
            batchId: batch.batch_id,
            cropType: batch.crop_type,
            quantityKg: Number(batch.quantity_kg),
            farm: farm?.farm_name?.trim() || "Unspecified farm",
            region: farm?.location?.trim() || "Unspecified region",
            date: batch.registered_at
              ? new Date(batch.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Unknown",
            registeredAt: batch.registered_at,
            status,
            custody: latestHandoff?.to_party || latestHandoff?.location || "No custody handoff recorded",
            stages: [
              "complete",
              inspected ? "complete" : "current",
              certified ? "complete" : inspected ? "current" : "pending",
              latestHandoff ? "complete" : certified ? "current" : "pending",
              delivered ? "complete" : latestHandoff ? "current" : "pending",
            ],
          };
        }));
      } catch (error) {
        const value = typeof error === "object" && error ? error as Record<string, unknown> : {};
        const message = typeof value.message === "string"
          ? value.message
          : error instanceof Error ? error.message : "Unknown trace query error";
        const code = typeof value.code === "string" ? value.code : null;
        console.warn("[AgriTrust Trace] Batch query failed", {
          message, code,
          details: typeof value.details === "string" ? value.details : null,
          hint: typeof value.hint === "string" ? value.hint : null,
        });
        setLoadError(code ? message + " [" + code + "]" : message);
      } finally {
        setIsLoading(false);
      }
    }
    void loadBatches();
  }, []);

  const crops = useMemo(() => [...new Set(batches.map((batch) => batch.cropType))].sort(), [batches]);
  const statuses = useMemo(() => [...new Set(batches.map((batch) => batch.status))].sort(), [batches]);
  const regions = useMemo(() => [...new Set(batches.map((batch) => batch.region))].sort(), [batches]);
  const filteredBatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    const cutoffDays = timeFilter === "30" ? 30 : timeFilter === "90" ? 90 : null;
    return batches.filter((batch) => {
      const registeredTime = batch.registeredAt ? new Date(batch.registeredAt).getTime() : Number.NaN;
      return (!term || [batch.batchId, batch.cropType, batch.farm, batch.region, batch.custody].join(" ").toLowerCase().includes(term))
        && (cropFilter === "ALL" || batch.cropType === cropFilter)
        && (statusFilter === "ALL" || batch.status === statusFilter)
        && (regionFilter === "ALL" || batch.region === regionFilter)
        && (cutoffDays === null || (Number.isFinite(registeredTime) && registeredTime >= filterReferenceTime - cutoffDays * 86400000));
    });
  }, [batches, cropFilter, filterReferenceTime, regionFilter, search, statusFilter, timeFilter]);

  return (
    <div className="pb-8">
      <header className="mb-6 px-8 pt-8">
        <div className="mb-2 flex items-center gap-2">
          <Route className="h-3.5 w-3.5 text-accent-green" />
          <span className="text-xs font-bold tracking-widest text-accent-green">SUPPLY CHAIN LEDGER</span>
        </div>
        <h1 className="text-3xl font-bold text-agri-text" style={{ fontFamily: "var(--font-outfit)" }}>Trace Batches</h1>
        <p className="mt-1 text-agri-muted">Search verified produce batches and inspect each custody handoff.</p>
      </header>

      <section className="mb-6 flex flex-wrap items-center gap-3 px-8">
        <label className="relative min-w-0 flex-[1_1_100%] sm:min-w-56 md:max-w-xs md:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
          <input className={selectClassName + " w-full pl-9"} onChange={(event) => setSearch(event.target.value)} placeholder="Search batch, farm, or custodian" type="search" value={search} />
        </label>
        <select className={selectClassName} onChange={(event) => setCropFilter(event.target.value)} value={cropFilter}>
          <option value="ALL">All Crops</option>{crops.map((crop) => <option key={crop}>{crop}</option>)}
        </select>
        <select className={selectClassName} onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
          <option value="ALL">All Statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
        <select className={selectClassName} onChange={(event) => setRegionFilter(event.target.value)} value={regionFilter}>
          <option value="ALL">All Regions</option>{regions.map((region) => <option key={region}>{region}</option>)}
        </select>
        <select className={selectClassName} onChange={(event) => setTimeFilter(event.target.value)} value={timeFilter}>
          <option value="ALL">All Time</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
        </select>
      </section>

      <section className="mx-8 divide-y divide-agri-border overflow-hidden rounded-xl border border-agri-border bg-agri-surface">
        {isLoading ? <p className="px-6 py-10 text-center text-sm text-agri-muted">Loading batches...</p>
          : loadError ? <p className="px-6 py-10 text-center text-sm text-accent-red">Trace records could not be loaded: {loadError}</p>
          : filteredBatches.length === 0 ? <p className="px-6 py-10 text-center text-sm text-agri-muted">{batches.length ? "No batches match the selected filters." : "No batches recorded for this account."}</p>
          : filteredBatches.map((batch) => (
            <article key={batch.batchId} className="flex flex-col items-stretch gap-4 px-4 py-4 transition-colors hover:bg-agri-raised/80 sm:px-6 lg:flex-row lg:items-center lg:gap-6">
              <span className={"w-fit shrink-0 rounded-full px-3 py-1.5 text-center text-xs font-bold " + statusClassName[batch.status] + " " + (statusHoverGlow[batch.status] || "")}>{batch.status}</span>
              <div className="min-w-0 lg:w-56 lg:shrink-0">
                <p className="text-sm font-medium text-agri-text">{batch.cropType} - {batch.farm}</p>
                <p className="font-mono text-sm font-bold text-agri-text">{batch.batchId}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-agri-muted">
                  <span className="flex items-center gap-1"><Package className="h-3 w-3" />{batch.quantityKg.toLocaleString()} kg</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{batch.region}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{batch.date}</span>
                </div>
                <p className="mt-1 text-xs text-agri-muted">Custody: {batch.custody}</p>
              </div>
              <div className="min-w-0 flex-1 overflow-x-auto pb-1"><MiniTimeline stages={batch.stages} /></div>
              <div className="flex shrink-0 items-center justify-end gap-4">
                <Link aria-label={"Open public verification for " + batch.batchId} href={"/verify/" + batch.batchId}>
                  <QrCode className="h-4.5 w-4.5 text-agri-muted hover:text-accent-green" />
                </Link>
                <Link className="text-sm text-accent-blue hover:text-accent-blue/80" href={"/dashboard/trace/" + batch.batchId}>View Details</Link>
              </div>
            </article>
          ))}
      </section>
      <footer className="mt-2 px-8 py-4 text-sm text-agri-muted">Showing {filteredBatches.length} of {batches.length} batches</footer>
    </div>
  );
}
