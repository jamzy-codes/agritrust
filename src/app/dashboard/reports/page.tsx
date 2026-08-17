"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ReportsPage() {
  const [farmName, setFarmName] = useState<string>("Okafor Family Farm");

  useEffect(() => {
    async function loadUserFarm() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (!userError && userData.user) {
        const { data: farm } = await supabase
          .from("farms")
          .select("farm_name")
          .eq("owner_id", userData.user.id)
          .maybeSingle();

        if (farm?.farm_name) {
          setFarmName(farm.farm_name);
        }
      }
    }
    loadUserFarm();
  }, []);

  const reports = [
    {
      title: "Q2 2026 Compliance Summary",
      meta: "Generated Jun 28, 2026 · PDF · 2.4 MB",
    },
    {
      title: "Batch Performance — June 2026",
      meta: "Generated Jun 20, 2026 · CSV · 180 KB",
    },
    {
      title: `Farm Audit — ${farmName}`,
      meta: "Generated Jun 15, 2026 · PDF · 1.1 MB",
    },
    {
      title: "Network Overview — May 2026",
      meta: "Generated Jun 01, 2026 · PDF · 3.2 MB",
    },
    {
      title: "Q1 2026 Compliance Summary",
      meta: "Generated Mar 30, 2026 · PDF · 2.1 MB",
    },
    {
      title: "Batch Performance — March 2026",
      meta: "Generated Mar 20, 2026 · CSV · 165 KB",
    },
  ];

  return (
    <div className="pb-10">
      <header className="mb-6 px-8 pt-8">
        <h1
          className="text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Reports
        </h1>
        <p className="mt-1 text-agri-muted">
          Generate and download compliance and performance reports.
        </p>
      </header>

      <div className="mx-8 mb-6 rounded-xl border border-agri-border bg-agri-surface p-6">
        <h3 className="mb-4 text-base font-semibold text-agri-text">
          Generate New Report
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-agri-muted">
              Report type
            </label>
            <select className="rounded-lg border border-agri-border bg-agri-raised px-3 py-2.5 text-sm text-agri-text">
              <option>Compliance Summary</option>
              <option>Batch Performance</option>
              <option>Farm Audit</option>
              <option>Network Overview</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-agri-muted">
              Date range
            </label>
            <select className="rounded-lg border border-agri-border bg-agri-raised px-3 py-2.5 text-sm text-agri-text">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>Custom range</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-agri-muted">
              Format
            </label>
            <select className="rounded-lg border border-agri-border bg-agri-raised px-3 py-2.5 text-sm text-agri-text">
              <option>PDF</option>
              <option>CSV</option>
              <option>Excel</option>
            </select>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-accent-blue px-5 py-2.5 text-sm font-medium text-white"
          >
            <FileText className="h-4 w-4" />
            Generate Report
          </button>
        </div>
      </div>

      <div className="mx-8 overflow-hidden rounded-xl border border-agri-border bg-agri-surface">
        <h3 className="px-5 pb-0 pt-5 text-base font-semibold text-agri-text">
          Recent Reports
        </h3>
        <div className="mt-2">
          {reports.map((report) => (
            <div
              key={report.title}
              className="flex items-center gap-4 border-b border-agri-border px-5 py-3 last:border-0 hover:bg-agri-raised/50"
            >
              <FileText className="h-5 w-5 flex-shrink-0 text-agri-muted" />
              <div className="flex-1">
                <p className="text-sm font-medium text-agri-text">
                  {report.title}
                </p>
                <p className="mt-0.5 text-xs text-agri-muted">{report.meta}</p>
              </div>
              <Download className="h-4 w-4 cursor-pointer text-agri-muted hover:text-accent-blue" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
