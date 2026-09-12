"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  Lock,
  PenLine,
  QrCode,
  ShieldCheck,
  Star,
} from "lucide-react";

import BrandLogo from "@/components/brand/BrandLogo";
import { api } from "@/lib/api";
import type { UserRole } from "@/types";
import { supabase } from "@/lib/supabase";

type ActiveTab = "records" | "issue";

interface ComplianceRecord {
  batchId: string;
  crop: string;
  gmoStatus: "NON-GMO" | "PENDING" | "GMO DETECTED";
  grade: string;
  inspector: string;
  issued: string;
  status: "ACTIVE" | "PENDING" | "EXPIRED" | "REVOKED";
}

const fieldClassName =
  "w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text placeholder:text-agri-muted transition-colors focus:border-agri-border-focus focus:outline-none";

const roleTabs: Record<UserRole, ActiveTab[]> = {
  FARMER: ["records"],
  INSPECTOR: ["records", "issue"],
  DISTRIBUTOR: ["records"],
  REGULATOR: ["records"],
  CONSUMER: ["records"],
};

function getGmoClass(value: ComplianceRecord["gmoStatus"]) {
  switch (value) {
    case "NON-GMO":
      return "bg-accent-green/20 text-accent-green";
    case "PENDING":
      return "bg-accent-amber/20 text-accent-amber";
    default:
      return "bg-accent-red/20 text-accent-red";
  }
}

function getStatusClass(value: ComplianceRecord["status"]) {
  switch (value) {
    case "ACTIVE":
      return "bg-accent-green/20 text-accent-green";
    case "PENDING":
      return "bg-accent-amber/20 text-accent-amber";
    case "REVOKED":
      return "bg-accent-red/20 text-accent-red";
    default:
      return "border border-agri-border bg-agri-raised text-agri-muted";
  }
}

function PageHeading() {
  return (
    <header className="mb-6 px-8 pt-8">
      <h1
        className="text-3xl font-bold text-agri-text"
        style={{ fontFamily: "var(--font-outfit)" }}
      >
        Compliance
      </h1>
      <p className="mt-1 text-agri-muted">
        Review biosafety records and issue certificates with trusted regulatory
        oversight.
      </p>
    </header>
  );
}

function RecordsTab() {
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecords() {
      const { data: batches } = await supabase
        .from("batches")
        .select("batch_id, crop_type, gmo_status, registered_at")
        .order("registered_at", { ascending: false });
      const batchIds = (batches || []).map((batch) => batch.batch_id);
      const inspectionResponses = await Promise.all(
        batchIds.map((batchId) =>
          api.get<{
            inspections: Array<{
              batch_id: string;
              quality_grade?: string | null;
              inspected_at?: string | null;
              certificate_issued?: boolean;
              gmo_test_result?: string | null;
              inspector_id?: string | null;
            }>;
          }>(`/api/inspections?batchId=${encodeURIComponent(batchId)}`)
        )
      );
      const inspections = inspectionResponses.flatMap((response) => response.inspections);
      const inspectorIds = Array.from(new Set((inspections || []).map((inspection) => inspection.inspector_id).filter(Boolean)));
      const { data: inspectors } = inspectorIds.length > 0
        ? await supabase.from("users").select("id, email, full_name").in("id", inspectorIds)
        : { data: [] };
      const inspectorMap = new Map((inspectors || []).map((inspector) => [inspector.id, inspector.full_name || inspector.email || "Inspector"]));
      const inspectionMap = new Map((inspections || []).map((inspection) => [inspection.batch_id, inspection]));
      setRecords((batches || []).map((batch) => {
        const inspection = inspectionMap.get(batch.batch_id);
        const certified = Boolean(inspection?.certificate_issued);
        return {
          batchId: batch.batch_id,
          crop: batch.crop_type,
          gmoStatus: inspection?.gmo_test_result === "GMO_PRESENT" ? "GMO DETECTED" : inspection ? "NON-GMO" : "PENDING",
          grade: inspection?.quality_grade || "—",
          inspector: inspection?.inspector_id ? inspectorMap.get(inspection.inspector_id) || "Inspector" : "Unassigned",
          issued: certified && inspection?.inspected_at ? new Date(inspection.inspected_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
          status: certified ? "ACTIVE" : "PENDING",
        };
      }));
      setIsLoading(false);
    }
    loadRecords();
  }, []);

  const certifiedCount = records.filter((record) => record.status === "ACTIVE").length;
  const pendingCount = records.filter((record) => record.status === "PENDING").length;

  return (
    <>
      <section className="mb-4 px-8">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
          <span className="text-xs font-bold tracking-widest text-accent-green">
            COMPLIANCE DASHBOARD
          </span>
        </div>
        <h2 className="mb-6 text-xl font-bold text-agri-text">
          Biosafety Records
        </h2>
      </section>

      <div className="mb-6 flex gap-4 px-8">
        <div className="flex items-center gap-3 rounded-xl card-gradient-green border border-white/5 px-4 py-3">
          <ShieldCheck className="h-4.5 w-4.5 text-accent-green" />
          <div>
            <p className="text-xl font-bold text-agri-text">{certifiedCount}</p>
            <p className="text-sm text-agri-muted">Certified batches</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl card-gradient-amber border border-white/5 px-4 py-3">
          <Clock className="h-4.5 w-4.5 text-accent-amber" />
          <div>
            <p className="text-xl font-bold text-agri-text">{pendingCount}</p>
            <p className="text-sm text-agri-muted">Pending inspection</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl card-gradient-purple border border-white/5 px-4 py-3">
          <Star className="h-4.5 w-4.5 text-accent-purple" />
          <div>
            <p className="text-xl font-bold text-agri-text">{records.length ? `${Math.round((certifiedCount / records.length) * 100)}%` : "0%"}</p>
            <p className="text-sm text-agri-muted">Compliance score</p>
          </div>
        </div>
      </div>

      <div className="mx-8 overflow-hidden rounded-xl glass">
        <table className="min-w-full">
          <thead className="bg-agri-raised">
            <tr>
              {[
                "Batch ID",
                "Crop",
                "GMO Status",
                "Grade",
                "Inspector",
                "Issued",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-agri-border px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-agri-muted"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-agri-muted">Loading compliance records...</td></tr> : records.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-agri-muted">No compliance records yet.</td></tr> : records.map((record) => (
              <tr
                key={record.batchId}
                className="transition-colors hover:bg-agri-raised/50"
              >
                <td className="border-b border-agri-border px-4 py-3 text-sm font-bold text-agri-text">
                  <span className="font-mono">{record.batchId}</span>
                </td>
                <td className="border-b border-agri-border px-4 py-3 text-sm text-agri-text">
                  {record.crop}
                </td>
                <td className="border-b border-agri-border px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${getGmoClass(record.gmoStatus)}`}
                  >
                    {record.gmoStatus}
                  </span>
                </td>
                <td className="border-b border-agri-border px-4 py-3 text-sm text-agri-text">
                  {record.grade}
                </td>
                <td className="border-b border-agri-border px-4 py-3 text-sm">
                  <span className="font-mono text-xs text-agri-muted">
                    {record.inspector}
                  </span>
                </td>
                <td className="border-b border-agri-border px-4 py-3 text-sm text-agri-text">
                  {record.issued}
                </td>
                <td className="border-b border-agri-border px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${getStatusClass(record.status)}`}
                  >
                    {record.status}
                  </span>
                </td>
                <td className="border-b border-agri-border px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/trace/${record.batchId}`}
                      className="text-xs text-accent-blue hover:underline"
                    >
                      View ↗
                    </Link>
                    <button
                      className="cursor-pointer text-agri-muted hover:text-agri-text"
                      type="button"
                      aria-label="Download record"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center gap-2 border-t border-agri-border bg-agri-raised px-4 py-3">
          <Lock className="h-3.5 w-3.5 text-agri-muted" />
          <p className="text-xs text-agri-muted">
            Compliance records are permanently anchored on the AgriTrust
            blockchain and cannot be altered.
          </p>
        </div>
      </div>
    </>
  );
}

function IssueCertificateTab() {
  return (
    <>
      <section className="mb-4 px-8">
        <div className="mb-2 flex items-center gap-2">
          <FileCheck className="h-3.5 w-3.5 text-accent-blue" />
          <span className="text-xs font-bold tracking-widest text-accent-blue">
            CERTIFICATE ISSUANCE
          </span>
        </div>
        <h2 className="mb-1 text-xl font-bold text-agri-text">
          Issue Biosafety Certificate
        </h2>
        <p className="text-sm text-agri-muted">
          Prepare a signed certificate for a verified batch inspection.
        </p>
      </section>

      <div className="grid grid-cols-[1fr_400px] gap-8 px-8">
        <div className="flex flex-col gap-5 rounded-xl border border-agri-border bg-agri-surface p-6">
          <label>
            <span className="mb-1 block text-sm text-agri-muted">Batch ID</span>
            <div className="relative">
              <input
                className={`${fieldClassName} font-mono`}
                defaultValue="AGT-0042"
              />
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-green" />
                <span className="text-xs text-accent-green">Verified</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-agri-muted">
              Batch exists and inspection is complete.
            </p>
          </label>

          <label>
            <span className="mb-1 block text-sm text-agri-muted">
              Certificate type
            </span>
            <select
              className={fieldClassName}
              defaultValue="Biosafety Compliance Certificate"
            >
              <option>Biosafety Compliance Certificate</option>
              <option>Export Compliance Certificate</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm text-agri-muted">
              Issuing authority
            </span>
            <div className="relative">
              <input
                className={`${fieldClassName} border-agri-border bg-agri-base text-agri-muted`}
                value="NAFDAC Regional Office, Port Harcourt"
                readOnly
              />
              <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
            </div>
            <p className="mt-1 text-xs text-agri-muted">
              (Auto-filled from your profile)
            </p>
          </label>

          <div className="flex gap-3">
            <div className="flex-1 rounded-xl border border-accent-green/30 bg-accent-green/20 p-2.5 text-center text-sm font-semibold text-accent-green">
              NON-GMO CONFIRMED
            </div>
            <div className="flex-1 rounded-xl border border-accent-green/30 bg-accent-green/20 p-2.5 text-center text-sm font-semibold text-accent-green">
              A+
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-sm text-agri-muted">
                Valid from
              </span>
              <input
                className={fieldClassName}
                type="date"
                defaultValue="2026-06-17"
              />
            </label>
            <label>
              <span className="mb-1 block text-sm text-agri-muted">
                Valid until
              </span>
              <input
                className={fieldClassName}
                type="date"
                defaultValue="2027-06-17"
              />
            </label>
          </div>

          <label className="flex items-start gap-3">
            <input
              className="mt-1 h-4 w-4 accent-accent-blue"
              type="checkbox"
            />
            <p className="text-xs text-agri-muted">
              I confirm this certificate is accurate and I accept responsibility
              for this declaration.
            </p>
          </label>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-blue py-3 font-semibold text-white"
            type="button"
          >
            <PenLine className="h-4 w-4" />
            Sign & Issue Certificate
          </button>

          <p className="flex items-center justify-center gap-2 text-center text-xs text-agri-muted">
            <ShieldCheck className="h-3 w-3" />
            Signing with NAFDAC-0042 authority key. This action is final.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
          <BrandLogo
            className="mb-3 justify-center"
            size="sm"
            textClassName="text-sm text-gray-800"
          />

          <h3 className="mb-3 text-center text-lg font-bold text-accent-blue">
            BIOSAFETY CERTIFICATE
          </h3>

          <div className="mb-4 border-t-2 border-accent-blue/20" />

          <div className="flex flex-col gap-2">
            {[
              ["Batch", "AGT-0042"],
              ["Crop", "Grade A Cocoa"],
              ["Grade", "A+"],
              ["GMO-free", "Yes"],
              ["Issued by", "NAFDAC Regional Office Port Harcourt"],
              ["Issue Date", "Jun 17, 2026"],
              ["Valid Until", "Jun 17, 2027"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-3"
              >
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs text-gray-500">Certificate ID</p>
              <p className="text-xs font-mono font-semibold text-accent-blue">
                CERT-7F3A-9B2C-0042
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div className="flex flex-col items-center">
              <div className="flex h-15 w-15 items-center justify-center rounded border border-gray-300 bg-gray-200">
                <QrCode className="h-6 w-6 text-gray-400" />
              </div>
              <p className="mt-1 text-[10px] text-gray-400">Scan to verify</p>
            </div>
            <div className="text-right">
              <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-gray-200" />
              <p className="text-[10px] text-gray-500">Authorized Inspector</p>
              <p className="text-[10px] text-gray-500">ID: NAFDAC-0042</p>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rotate-[-30deg]">
            <span className="text-xl font-bold text-red-200/60">
              PREVIEW — NOT YET ISSUED
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CompliancePage() {
  const [role, setRole] = useState<UserRole>("FARMER");
  useEffect(() => {
    async function loadRole() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase.from("users").select("role").eq("id", userData.user.id).maybeSingle();
      if (profile?.role) setRole(profile.role as UserRole);
    }
    loadRole();
  }, []);

  const allowedTabIds = roleTabs[role];
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    allowedTabIds[0] ?? "records",
  );

  const tabs = [
    {
      id: "records" as const,
      icon: ShieldCheck,
      label: "Biosafety Records",
      activeClass: "bg-accent-green text-white",
    },
    {
      id: "issue" as const,
      icon: FileCheck,
      label: "Issue Certificate",
      activeClass: "bg-accent-blue text-white",
    },
  ];
  const visibleTabs = tabs.filter((tab) => allowedTabIds.includes(tab.id));

  return (
    <div className="pb-8">
      <PageHeading />

      {visibleTabs.length > 1 ? (
        <div className="mb-8 flex gap-2 px-8">
          {visibleTabs.map(({ id, icon: Icon, label, activeClass }) => {
            const isActive = activeTab === id;

            return (
              <button
                key={id}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${isActive
                  ? activeClass
                  : "border border-agri-border text-agri-muted hover:bg-agri-raised hover:text-agri-text"
                  }`}
                type="button"
                onClick={() => setActiveTab(id)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {activeTab === "records" ? <RecordsTab /> : null}
      {activeTab === "issue" ? <IssueCertificateTab /> : null}
    </div>
  );
}
