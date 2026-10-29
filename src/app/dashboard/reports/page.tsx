"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

type ReportType = "compliance" | "batches" | "farm-audit" | "handoffs" | "network";
type ReportRow = Record<string, string | number | boolean | null>;

interface GeneratedReport {
  title: string;
  generatedAt: string;
  dateRange: string;
  filename: string;
  csv: string;
  recordCount: number;
}

const REPORT_LABELS: Record<ReportType, string> = {
  compliance: "Compliance Summary",
  batches: "Batch Performance",
  "farm-audit": "Farm Audit",
  handoffs: "Handoff Activity",
  network: "Network Overview",
};

const ROLE_REPORTS: Record<Exclude<UserRole, "CONSUMER">, ReportType[]> = {
  FARMER: ["compliance", "batches", "farm-audit"],
  INSPECTOR: ["compliance"],
  DISTRIBUTOR: ["handoffs", "compliance"],
  REGULATOR: ["compliance", "batches", "farm-audit", "network"],
};

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const serialized = typeof value === "object" ? JSON.stringify(value) : String(value);
  const formulaSafe = /^[=+-@]/.test(serialized) ? "'" + serialized : serialized;
  return '"' + formulaSafe.replaceAll('"', '""') + '"';
}

function createCsv(
  title: string,
  generatedAt: string,
  dateRange: string,
  role: UserRole,
  rows: ReportRow[],
): string {
  const metadata = [
    ["Report title", title],
    ["Generated at", generatedAt],
    ["Date range", dateRange],
    ["Authorized role", role],
    ["Record count", rows.length],
  ].map((row) => row.map(toCsvCell).join(",")).join("\r\n");

  if (rows.length === 0) {
    return "\uFEFF" + metadata + "\r\n\r\n" +
      toCsvCell("No records found for the selected date range.") + "\r\n";
  }

  const headers = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()),
  );
  const records = [
    headers.map(toCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => toCsvCell(row[header])).join(",")),
  ].join("\r\n");

  return "\uFEFF" + metadata + "\r\n\r\n" + records + "\r\n";
}

function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function startDateForRange(days: number): string {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString();
}

function normalizeRows(rows: Array<Record<string, unknown>> | null): ReportRow[] {
  return (rows ?? []).map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value && typeof value === "object"
          ? JSON.stringify(value)
          : (value as ReportRow[string]),
      ]),
    ),
  );
}

async function getScopedBatchIds(role: UserRole, userId: string): Promise<string[] | null> {
  if (role === "FARMER") {
    const { data, error } = await supabase
      .from("batches")
      .select("batch_id")
      .eq("registered_by", userId);
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((row) => row.batch_id)));
  }

  if (role === "DISTRIBUTOR") {
    const { data, error } = await supabase
      .from("handoffs")
      .select("batch_id")
      .eq("distributor_id", userId);
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((row) => row.batch_id)));
  }

  return null;
}

async function loadReportRows(
  reportType: ReportType,
  role: UserRole,
  userId: string,
  startDate: string,
): Promise<ReportRow[]> {
  if (reportType === "compliance") {
    let query = supabase
      .from("inspections")
      .select("id, batch_id, inspector_id, quality_grade, gmo_test_result, certificate_issued, inspected_at")
      .gte("inspected_at", startDate)
      .order("inspected_at", { ascending: false });

    if (role === "INSPECTOR") {
      query = query.eq("inspector_id", userId);
    } else if (role === "FARMER" || role === "DISTRIBUTOR") {
      const batchIds = await getScopedBatchIds(role, userId);
      if (!batchIds?.length) return [];
      query = query.in("batch_id", batchIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return normalizeRows(data);
  }

  if (reportType === "batches") {
    let query = supabase
      .from("batches")
      .select("batch_id, registered_by, crop_type, quantity_kg, seed_variety, gmo_status, status, registered_at")
      .gte("registered_at", startDate)
      .order("registered_at", { ascending: false });

    if (role === "FARMER") query = query.eq("registered_by", userId);

    const { data, error } = await query;
    if (error) throw error;
    return normalizeRows(data);
  }

  if (reportType === "farm-audit") {
    let query = supabase
      .from("farms")
      .select("id, owner_id, farm_name, location, nasc_registration, primary_crops, created_at")
      .gte("created_at", startDate)
      .order("created_at", { ascending: false });

    if (role === "FARMER") query = query.eq("owner_id", userId);

    const { data, error } = await query;
    if (error) throw error;
    return normalizeRows(data);
  }

  if (reportType === "handoffs") {
    const { data, error } = await supabase
      .from("handoffs")
      .select("id, batch_id, distributor_id, from_party, to_party, location, transport_method, handed_off_at, tx_hash")
      .eq("distributor_id", userId)
      .gte("handed_off_at", startDate)
      .order("handed_off_at", { ascending: false });

    if (error) throw error;
    return normalizeRows(data);
  }

  const [batches, inspections, farms, handoffs] = await Promise.all([
    supabase.from("batches").select("batch_id", { count: "exact", head: true }).gte("registered_at", startDate),
    supabase.from("inspections").select("id", { count: "exact", head: true }).gte("inspected_at", startDate),
    supabase.from("farms").select("id", { count: "exact", head: true }).gte("created_at", startDate),
    supabase.from("handoffs").select("id", { count: "exact", head: true }).gte("handed_off_at", startDate),
  ]);
  const error = batches.error || inspections.error || farms.error || handoffs.error;
  if (error) throw error;

  return [
    { metric: "Batches registered", value: batches.count ?? 0 },
    { metric: "Inspections recorded", value: inspections.count ?? 0 },
    { metric: "Farms added", value: farms.count ?? 0 },
    { metric: "Handoffs recorded", value: handoffs.count ?? 0 },
  ];
}

export default function ReportsPage() {
  const [role, setRole] = useState<Exclude<UserRole, "CONSUMER"> | null>(null);
  const [reportType, setReportType] = useState<ReportType>("compliance");
  const [rangeDays, setRangeDays] = useState("30");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadRole() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw userError ?? new Error("You must be signed in to generate reports.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", userData.user.id)
          .single();
        if (profileError || !profile) {
          throw profileError ?? new Error("Your role could not be resolved.");
        }
        if (profile.role === "CONSUMER") {
          throw new Error("Reports are not available for this account role.");
        }

        if (isActive) {
          const resolvedRole = profile.role as Exclude<UserRole, "CONSUMER">;
          setRole(resolvedRole);
          setReportType(ROLE_REPORTS[resolvedRole][0]);
        }
      } catch (error) {
        console.error("Error loading report permissions:", error);
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Reports could not be loaded.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadRole();
    return () => {
      isActive = false;
    };
  }, []);

  const availableReports = useMemo(() => (role ? ROLE_REPORTS[role] : []), [role]);

  async function handleGenerateReport() {
    if (!role) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw userError ?? new Error("Your session has expired.");
      }

      const days = Number(rangeDays);
      const startDate = startDateForRange(days);
      const generatedDate = new Date();
      const rows = await loadReportRows(reportType, role, userData.user.id, startDate);
      const title = REPORT_LABELS[reportType] + " — " + role;
      const generatedAt = generatedDate.toLocaleString();
      const dateRange = new Date(startDate).toLocaleDateString() + " to " +
        generatedDate.toLocaleDateString();
      const filename = "agritrust-" + reportType + "-" +
        generatedDate.toISOString().slice(0, 10) + ".csv";
      const csv = createCsv(title, generatedAt, dateRange, role, rows);
      const generatedReport = {
        title,
        generatedAt,
        dateRange,
        filename,
        csv,
        recordCount: rows.length,
      };

      downloadCsv(filename, csv);
      setGeneratedReports((current) => [generatedReport, ...current].slice(0, 5));
      setSuccessMessage(
        filename + " downloaded with " + rows.length + " " +
          (rows.length === 1 ? "record" : "records") + ".",
      );
    } catch (error) {
      console.error("Error generating report:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "The report could not be generated.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="pb-10">
      <header className="mb-6 px-4 pt-6 sm:px-8 sm:pt-8">
        <h1 className="text-3xl font-bold text-agri-text" style={{ fontFamily: "var(--font-outfit)" }}>
          Reports
        </h1>
        <p className="mt-1 text-agri-muted">
          Generate and download reports from the records available to your role.
        </p>
      </header>

      <section className="mx-4 mb-6 rounded-xl border border-agri-border bg-agri-surface p-5 sm:mx-8 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-agri-text">Generate New Report</h2>

        {isLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-agri-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading report permissions...
          </div>
        ) : (
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-end">
            <label className="flex-1 text-xs text-agri-muted">
              Report type
              <select
                className="mt-1.5 w-full rounded-lg border border-agri-border bg-agri-raised px-3 py-2.5 text-sm text-agri-text outline-none transition-colors hover:border-agri-border-focus focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
                value={reportType}
                onChange={(event) => setReportType(event.target.value as ReportType)}
                disabled={!role || isGenerating}
              >
                {availableReports.map((type) => (
                  <option key={type} value={type}>{REPORT_LABELS[type]}</option>
                ))}
              </select>
            </label>

            <label className="flex-1 text-xs text-agri-muted">
              Date range
              <select
                className="mt-1.5 w-full rounded-lg border border-agri-border bg-agri-raised px-3 py-2.5 text-sm text-agri-text outline-none transition-colors hover:border-agri-border-focus focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
                value={rangeDays}
                onChange={(event) => setRangeDays(event.target.value)}
                disabled={!role || isGenerating}
              >
                {RANGE_OPTIONS.map((range) => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </label>

            <label className="flex-1 text-xs text-agri-muted">
              Format
              <select
                className="mt-1.5 w-full rounded-lg border border-agri-border bg-agri-raised px-3 py-2.5 text-sm text-agri-text"
                value="CSV"
                disabled
              >
                <option>CSV</option>
              </select>
            </label>

            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-blue px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue active:translate-y-px disabled:cursor-not-allowed disabled:bg-accent-blue/40 disabled:text-white/60 disabled:shadow-none"
              onClick={handleGenerateReport}
              disabled={!role || isGenerating}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isGenerating ? "Generating..." : "Generate Report"}
            </button>
          </div>
        )}

        <div className="mt-4 min-h-5 text-sm" aria-live="polite">
          {errorMessage ? (
            <p className="text-accent-red">{errorMessage}</p>
          ) : successMessage ? (
            <p className="text-accent-green">{successMessage}</p>
          ) : (
            <p className="text-xs text-agri-muted">
              CSV is used so reports can be opened reliably without adding a document dependency.
            </p>
          )}
        </div>
      </section>

      <section className="mx-4 overflow-hidden rounded-xl border border-agri-border bg-agri-surface sm:mx-8">
        <h2 className="px-5 pt-5 text-base font-semibold text-agri-text">
          Reports generated this session
        </h2>

        {generatedReports.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="mx-auto h-9 w-9 text-agri-muted/60" />
            <p className="mt-3 text-sm font-medium text-agri-text">No reports generated yet</p>
            <p className="mt-1 text-xs text-agri-muted">
              Generated reports will appear here for the rest of this session.
            </p>
          </div>
        ) : (
          <div className="mt-2">
            {generatedReports.map((report) => (
              <div
                key={report.filename + "-" + report.generatedAt}
                className="flex items-center gap-4 border-b border-agri-border px-5 py-3 transition-colors last:border-0 hover:bg-agri-raised/50"
              >
                <FileText className="h-5 w-5 shrink-0 text-agri-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-agri-text">{report.title}</p>
                  <p className="mt-0.5 text-xs text-agri-muted">
                    {report.generatedAt} · {report.dateRange} · {report.recordCount} records · CSV
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-agri-muted transition-colors hover:bg-agri-overlay hover:text-accent-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue active:translate-y-px"
                  onClick={() => downloadCsv(report.filename, report.csv)}
                  aria-label={"Download " + report.title + " again"}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}