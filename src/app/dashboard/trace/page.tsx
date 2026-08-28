"use client";

import {
  Calendar,
  LayoutGrid,
  LayoutList,
  MapPin,
  Package,
  QrCode,
  Route,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MiniTimeline } from "@/components/ui/MiniTimeline";
import { supabase } from "@/lib/supabase";

interface TraceBatch {
  batchId: string;
  cropType: string;
  quantityKg: number;
  region: string;
  date: string;
  status: string;
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

  useEffect(() => {
    async function loadBatches() {
      const { data: batchRows } = await supabase
        .from("batches")
        .select("batch_id, crop_type, quantity_kg, status, registered_at, farm_id")
        .order("registered_at", { ascending: false });
      const batchIds = (batchRows || []).map((batch) => batch.batch_id);
      const { data: inspections } = batchIds.length > 0
        ? await supabase.from("inspections").select("batch_id, certificate_issued").in("batch_id", batchIds)
        : { data: [] };
      const certifiedIds = new Set((inspections || []).filter((inspection) => inspection.certificate_issued).map((inspection) => inspection.batch_id));
      setBatches((batchRows || []).map((batch) => {
        const status = certifiedIds.has(batch.batch_id) ? "CERTIFIED" : batch.status === "DELIVERED" ? "DELIVERED" : batch.status === "FLAGGED" ? "FLAGGED" : batch.status === "IN_TRANSIT" ? "IN TRANSIT" : "AWAITING INSPECTION";
        const stages: TraceBatch["stages"] = status === "CERTIFIED" ? ["complete", "complete", "complete", "complete", "complete"] : status === "IN TRANSIT" ? ["complete", "complete", "complete", "current", "pending"] : ["complete", "complete", "current", "pending", "pending"];
        return { batchId: batch.batch_id, cropType: batch.crop_type, quantityKg: Number(batch.quantity_kg), region: batch.farm_id || "Farm record", date: batch.registered_at ? new Date(batch.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown", status, stages };
      }));
      setIsLoading(false);
    }
    loadBatches();
  }, []);

  return (
    <div className="pb-8">
      <header className="mb-6 px-8 pt-8">
        <div className="mb-2 flex items-center gap-2">
          <Route className="h-3.5 w-3.5 text-accent-green" />
          <span className="text-xs font-bold tracking-widest text-accent-green">
            SUPPLY CHAIN LEDGER
          </span>
        </div>
        <h1
          className="text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Trace Batches
        </h1>
        <p className="mt-1 text-agri-muted">
          Search verified produce batches and inspect each custody handoff.
        </p>
      </header>

      <section className="mb-6 flex flex-wrap items-center gap-3 px-8">
        <select className={selectClassName} defaultValue="All Crops">
          <option>All Crops</option>
        </select>
        <select className={selectClassName} defaultValue="All Statuses">
          <option>All Statuses</option>
        </select>
        <select className={selectClassName} defaultValue="All Regions">
          <option>All Regions</option>
        </select>
        <select className={selectClassName} defaultValue="All Time">
          <option>All Time</option>
        </select>

        <div className="ml-auto flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-agri-border px-3 py-2 text-sm text-agri-muted hover:text-agri-text" type="button">
            <Upload className="h-4 w-4" />
            Export
          </button>
          <button className="rounded-lg bg-agri-raised px-3 py-2 text-agri-text" type="button" aria-label="List view">
            <LayoutList className="h-4 w-4" />
          </button>
          <button className="rounded-lg px-3 py-2 text-agri-muted" type="button" aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="mx-8 overflow-hidden rounded-xl border border-agri-border bg-agri-surface divide-y divide-agri-border">
        {isLoading ? <p className="px-6 py-10 text-center text-sm text-agri-muted">Loading batches...</p> : batches.length === 0 ? <p className="px-6 py-10 text-center text-sm text-agri-muted">No batches recorded yet.</p> : batches.map((batch) => (
          <article
            key={batch.batchId}
            className="flex items-center gap-6 px-6 py-4 transition-colors hover:bg-agri-raised/80"
          >
            <span
              className={`w-36 shrink-0 rounded-full px-3 py-1.5 text-center text-xs font-bold transition-all duration-300 ${statusClassName[batch.status]} ${statusHoverGlow[batch.status] || ""}`}
            >
              {batch.status}
            </span>

            <div className="w-48 shrink-0">
              <p className="text-sm font-medium text-agri-text">{batch.cropType}</p>
              <p className="font-mono text-sm font-bold text-agri-text">{batch.batchId}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-agri-muted">
                  <Package className="h-3 w-3" />
                  {batch.quantityKg} kg
                </span>
                <span className="flex items-center gap-1 text-xs text-agri-muted">
                  <MapPin className="h-3 w-3" />
                  {batch.region}
                </span>
                <span className="flex items-center gap-1 text-xs text-agri-muted">
                  <Calendar className="h-3 w-3" />
                  {batch.date}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <MiniTimeline stages={batch.stages} />
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <QrCode className="h-4.5 w-4.5 cursor-pointer text-agri-muted hover:text-accent-green" />
              <Link
                className="text-sm text-accent-blue hover:text-accent-blue/80"
                href={`/dashboard/trace/${batch.batchId}`}
              >
                View Details
              </Link>
            </div>
          </article>
        ))}
      </section>

      <footer className="mt-2 flex items-center justify-between px-8 py-4">
        <p className="text-sm text-agri-muted">Showing {batches.length} batches</p>
      </footer>
    </div>
  );
}