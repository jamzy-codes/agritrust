"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Clock,
  Download,
  FileCheck,
  Lock,
  ShieldCheck,
  Star,
} from "lucide-react";

import type { UserRole } from "@/types";
import { supabase } from "@/lib/supabase";

type ActiveTab = "records" | "issue";

interface ComplianceRecord {
  batchId: string;
  crop: string;
  gmoStatus: "NON-GMO" | "PENDING" | "GMO DETECTED";
  grade: string;
  weightKg: number | null;
  inspector: string;
  issued: string;
  status: "ACTIVE" | "PENDING" | "EXPIRED" | "REVOKED";
}

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

function RecordsTab({ role }: { role: UserRole }) {
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecords() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw userError ?? new Error("A signed-in user is required.");
        }

        let accessibleBatchIds: string[] | null = null;
        if (role === "INSPECTOR") {
          const { data, error } = await supabase
            .from("inspections")
            .select("batch_id")
            .eq("inspector_id", userData.user.id);
          if (error) throw error;
          accessibleBatchIds = Array.from(
            new Set((data ?? []).map((row) => row.batch_id)),
          );
        } else if (role === "DISTRIBUTOR") {
          const { data, error } = await supabase
            .from("handoffs")
            .select("batch_id")
            .eq("distributor_id", userData.user.id);
          if (error) throw error;
          accessibleBatchIds = Array.from(
            new Set((data ?? []).map((row) => row.batch_id)),
          );
        }

        if (accessibleBatchIds && accessibleBatchIds.length === 0) {
          setRecords([]);
          return;
        }

        let batchQuery = supabase
          .from("batches")
          .select(
            "batch_id, registered_by, crop_type, gmo_status, status, registered_at",
          )
          .order("registered_at", { ascending: false });

        if (role === "FARMER") {
          batchQuery = batchQuery.eq("registered_by", userData.user.id);
        } else if (role === "CONSUMER") {
          batchQuery = batchQuery.in("status", [
            "CERTIFIED",
            "IN_TRANSIT",
            "DELIVERED",
          ]);
        } else if (accessibleBatchIds) {
          batchQuery = batchQuery.in("batch_id", accessibleBatchIds);
        }

        const { data: batches, error: batchesError } = await batchQuery;
        if (batchesError) throw batchesError;

        const batchIds = (batches ?? []).map((batch) => batch.batch_id);
        if (batchIds.length === 0) {
          setRecords([]);
          return;
        }

        let inspectionQuery = supabase
          .from("inspections")
          .select(
            "batch_id, inspector_id, weight_kg, quality_grade, gmo_test_result, certificate_issued, inspected_at",
          )
          .in("batch_id", batchIds)
          .order("inspected_at", { ascending: true });

        if (role === "INSPECTOR") {
          inspectionQuery = inspectionQuery.eq(
            "inspector_id",
            userData.user.id,
          );
        }

        const { data: inspections, error: inspectionsError } =
          await inspectionQuery;
        if (inspectionsError) throw inspectionsError;

        const inspectorIds = Array.from(
          new Set(
            (inspections ?? [])
              .map((inspection) => inspection.inspector_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        const { data: inspectors, error: inspectorsError } =
          inspectorIds.length > 0
            ? await supabase
                .from("users")
                .select("id, email, full_name")
                .in("id", inspectorIds)
            : { data: [], error: null };
        if (inspectorsError) throw inspectorsError;

        const inspectorMap = new Map(
          (inspectors ?? []).map((inspector) => [
            inspector.id,
            inspector.full_name || inspector.email || "Inspector",
          ]),
        );
        const inspectionMap = new Map(
          (inspections ?? []).map((inspection) => [
            inspection.batch_id,
            inspection,
          ]),
        );

        setRecords(
          (batches ?? []).map((batch) => {
            const inspection = inspectionMap.get(batch.batch_id);
            const certified = Boolean(inspection?.certificate_issued);
            const gmoStatus: ComplianceRecord["gmoStatus"] =
              inspection?.gmo_test_result === "GMO_PRESENT"
                ? "GMO DETECTED"
                : inspection?.gmo_test_result === "NON_GMO"
                  ? "NON-GMO"
                  : "PENDING";

            return {
              batchId: batch.batch_id,
              crop: batch.crop_type,
              gmoStatus,
              grade: inspection?.quality_grade || "N/A",
              weightKg:
                inspection?.weight_kg == null
                  ? null
                  : Number(inspection.weight_kg),
              inspector: inspection?.inspector_id
                ? inspectorMap.get(inspection.inspector_id) || "Inspector"
                : "Unassigned",
              issued:
                certified && inspection?.inspected_at
                  ? new Date(inspection.inspected_at).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" },
                    )
                  : "N/A",
              status: certified ? "ACTIVE" : "PENDING",
            };
          }),
        );
      } catch (error) {
        const value =
          typeof error === "object" && error
            ? (error as Record<string, unknown>)
            : {};
        const message =
          typeof value.message === "string"
            ? value.message
            : error instanceof Error
              ? error.message
              : "Unknown compliance query error";
        const code = typeof value.code === "string" ? value.code : null;
        console.warn("[AgriTrust Compliance] Records query failed", {
          message,
          code,
          details:
            typeof value.details === "string" ? value.details : null,
          hint: typeof value.hint === "string" ? value.hint : null,
        });
        setLoadError(code ? message + " [" + code + "]" : message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadRecords();
  }, [role]);
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

      <div className="mb-6 flex flex-wrap gap-4 px-8">
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

      <div className="mx-8 overflow-x-auto rounded-xl glass">
        <table className="min-w-full">
          <thead className="bg-agri-raised">
            <tr>
              {[
                "Batch ID",
                "Crop",
                "GMO Status",
                "Grade",
                "Weight",
                "Inspector",
                "Inspected",
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
            {isLoading ? <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-agri-muted">Loading compliance records...</td></tr> : loadError ? <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-accent-red">Compliance records could not be loaded: {loadError}</td></tr> : records.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-agri-muted">No compliance records yet.</td></tr> : records.map((record) => (
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
                <td className="border-b border-agri-border px-4 py-3 text-sm text-agri-text">
                  {record.weightKg == null ? "N/A" : record.weightKg.toLocaleString() + " kg"}
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
    <section className="mx-8 rounded-xl border border-agri-border bg-agri-surface p-8">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-blue/10">
          <FileCheck className="h-6 w-6 text-accent-blue" />
        </div>
        <h2 className="text-xl font-bold text-agri-text">
          Issue a verified certificate
        </h2>
        <p className="mt-2 text-sm text-agri-muted">
          Certificate issuance requires an inspected on-chain batch. The Inspector
          workflow validates the current contract state before requesting a wallet
          signature.
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-blue px-5 py-3 text-sm font-semibold text-white"
          href="/dashboard/register"
        >
          <ShieldCheck className="h-4 w-4" />
          Open Inspector workflow
        </Link>
      </div>
    </section>
  );
}
export default function CompliancePage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  useEffect(() => {
    async function loadRole() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw userError ?? new Error("A signed-in user is required.");
        }
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", userData.user.id)
          .single();
        if (profileError) throw profileError;
        setRole(profile.role as UserRole);
      } catch (error) {
        const value = typeof error === "object" && error ? error as Record<string, unknown> : {};
        const message = typeof value.message === "string"
          ? value.message
          : error instanceof Error ? error.message : "Unknown role query error";
        const code = typeof value.code === "string" ? value.code : null;
        console.warn("[AgriTrust Compliance] Role query failed", {
          message,
          code,
          details: typeof value.details === "string" ? value.details : null,
          hint: typeof value.hint === "string" ? value.hint : null,
        });
        setRoleError(code ? message + " [" + code + "]" : message);
      }
    }
    void loadRole();
  }, []);

  const allowedTabIds = role ? roleTabs[role] : ["records" as const];
  const [activeTab, setActiveTab] = useState<ActiveTab>("records");
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

  if (roleError) {
    return (
      <div className="pb-8">
        <PageHeading />
        <div className="mx-8 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
          Compliance access could not be verified: {roleError}
        </div>
      </div>
    );
  }
  if (!role) {
    return (
      <div className="pb-8">
        <PageHeading />
        <p className="px-8 py-10 text-sm text-agri-muted">Loading compliance access...</p>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <PageHeading />

      {visibleTabs.length > 1 ? (
        <div className="mb-8 flex gap-2 overflow-x-auto px-8 pb-1">
          {visibleTabs.map(({ id, icon: Icon, label, activeClass }) => {
            const isActive = activeTab === id;

            return (
              <button
                key={id}
                className={"flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all " + (isActive
                  ? activeClass
                  : "border border-agri-border text-agri-muted hover:bg-agri-raised hover:text-agri-text")}
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

      {activeTab === "records" ? <RecordsTab role={role} /> : null}
      {activeTab === "issue" ? <IssueCertificateTab /> : null}
    </div>
  );
}
