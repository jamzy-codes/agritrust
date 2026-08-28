"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { api } from "@/lib/api";

interface BatchRow {
  id: string;
  crop: string;
  quantity: string;
  farm: string;
  status: string;
  statusTone: string;
  registered: string;
}

function statusTone(status: string) {
  if (status === "CERTIFIED") return "bg-accent-green/20 text-accent-green";
  if (status === "FLAGGED") return "bg-accent-red/20 text-accent-red";
  if (status === "REGISTERED") return "bg-accent-blue/20 text-accent-blue";
  return "bg-accent-amber/20 text-accent-amber";
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBatches() {
      try {
        const response = await api.get<{ batches: Array<{ batch_id: string; crop_type: string; quantity_kg: number | string; status: string; registered_at?: string; farms?: { farm_name?: string } | { farm_name?: string }[] }> }>("/api/batches");

        setBatches((response.batches || []).map((batch) => ({
          id: batch.batch_id,
          crop: batch.crop_type,
          quantity: `${Number(batch.quantity_kg).toLocaleString()} kg`,
          farm: (Array.isArray(batch.farms) ? batch.farms[0] : batch.farms as { farm_name?: string } | null)?.farm_name || "Unassigned farm",
          status: batch.status,
          statusTone: statusTone(batch.status),
          registered: batch.registered_at ? new Date(batch.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown",
        })));
      } finally {
        setIsLoading(false);
      }
    }

    loadBatches();
  }, []);

  const filteredBatches = batches.filter((batch) =>
    `${batch.id} ${batch.crop} ${batch.farm}`.toLowerCase().includes(search.toLowerCase()),
  );
  const stats = [
    { value: batches.length.toString(), label: "Total batches" },
    { value: batches.filter((batch) => batch.status === "CERTIFIED").length.toString(), label: "Certified" },
    { value: batches.filter((batch) => batch.status !== "CERTIFIED").length.toString(), label: "In progress" },
  ];

  return (
    <div className="pb-10">
      <header className="mb-6 px-8 pt-8">
        <h1
          className="text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Batches
        </h1>
        <p className="mt-1 text-agri-muted">
          Every produce batch registered on AgriTrust.
        </p>
      </header>

      <div className="mb-6 flex gap-4 px-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-agri-border bg-agri-surface px-4 py-3"
          >
            <p className="text-lg font-bold text-agri-text">{stat.value}</p>
            <p className="text-sm text-agri-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 px-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
          <input
            className="w-72 rounded-lg border border-agri-border bg-agri-surface py-2 pl-9 pr-4 text-sm text-agri-text placeholder:text-agri-muted focus:border-agri-border-focus focus:outline-none"
            placeholder="Search by batch ID or crop..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select className="rounded-lg border border-agri-border bg-agri-surface px-3 py-2 text-sm text-agri-text">
          <option>All Statuses</option>
        </select>
        <select className="rounded-lg border border-agri-border bg-agri-surface px-3 py-2 text-sm text-agri-text">
          <option>All Crops</option>
        </select>
      </div>

      <div className="mx-8 overflow-hidden rounded-xl border border-agri-border bg-agri-surface">
        <table className="min-w-full">
          <thead className="bg-agri-raised">
            <tr>
              {[
                "Batch ID",
                "Crop",
                "Quantity",
                "Farm",
                "Status",
                "Registered",
                "Actions",
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
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-agri-muted">Loading batches...</td></tr> : filteredBatches.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-agri-muted">No batches found.</td></tr> : filteredBatches.map((batch) => (
              <tr key={batch.id} className="border-t border-agri-border">
                <td className="px-4 py-3 font-mono text-xs font-bold text-accent-cyan">
                  {batch.id}
                </td>
                <td className="px-4 py-3 text-sm text-agri-text">
                  {batch.crop}
                </td>
                <td className="px-4 py-3 text-sm text-agri-text">
                  {batch.quantity}
                </td>
                <td className="px-4 py-3 text-sm text-agri-text">
                  {batch.farm}
                </td>
                <td className="px-4 py-3 text-sm text-agri-text">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${batch.statusTone}`}
                  >
                    {batch.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-agri-text">
                  {batch.registered}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/dashboard/trace/${batch.id}`}
                    className="text-accent-blue"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mx-8 mt-4 flex flex-col gap-2 text-sm text-agri-muted">
        <p>Showing {filteredBatches.length} of {batches.length} batches</p>
      </div>
    </div>
  );
}
