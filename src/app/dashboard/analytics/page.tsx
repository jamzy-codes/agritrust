"use client";



import { useEffect, useMemo, useState } from "react";

import {

  Box,

  Clock,

  Flag,

  Leaf,

  Scale,

  ShieldCheck,

  Users,

  type LucideIcon,

} from "lucide-react";

import {

  Bar,

  BarChart,

  CartesianGrid,

  Cell,

  Label,

  Legend,

  Line,

  LineChart,

  Pie,

  PieChart,

  ResponsiveContainer,

  Tooltip,

  XAxis,

  YAxis,

} from "recharts";



import type { UserRole } from "@/types";
import { supabase } from "@/lib/supabase";



const chartTooltipStyle = {
  backgroundColor: "#1a1a28",
  border: "1px solid #2a2a3e",
  borderRadius: "8px",
  color: "#f0f0f5",
};


type TrendTone = "green" | "amber" | "red";



interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  trend: string;
  trendTone: TrendTone;
  iconColor: string;
  bgClassName?: string;
  iconGlow?: string;
  iconBg?: string;
}
function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  trendTone,
  iconColor,
  bgClassName = "bg-agri-surface",
  iconGlow = "",
  iconBg = "bg-agri-raised",
}: StatCardProps) {
  return (
    <div className={`rounded-xl border border-white/5 p-4 ${bgClassName} hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-agri-text">{value}</p>
          <p className="mt-1 text-sm text-agri-muted">{label}</p>
          <p
            className={`mt-2 text-xs font-medium ${trendTone === "green" ? "text-accent-green" : trendTone === "amber" ? "text-accent-amber" : "text-accent-red"}`}
          >
            {trend}
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconGlow}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}



function FarmerAnalytics() {
  const [selectedRange, setSelectedRange] = useState("Last 6 months");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [farmerData, setFarmerData] = useState({
    totalBatches: 0,
    certifiedBatches: 0,
    totalProduceKg: 0,
    averageCertificationDays: null as number | null,
    batches: [] as Array<{
      batch_id: string;
      crop_type: string;
      quantity_kg: number;
      status: string;
      registered_at: string | null;
      inspected_at: string | null;
      quality_grade: string | null;
    }>,
    timeline: [] as Array<{
      batch_id: string;
      state: "green" | "amber";
      text: string;
      date: string;
    }>,
  });

  useEffect(() => {
    async function loadFarmerAnalytics() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw userError ?? new Error("A signed-in user is required.");
        }

        const now = new Date();
        const rangeStart = new Date(now);
        if (selectedRange === "Last 3 months") {
          rangeStart.setMonth(rangeStart.getMonth() - 3);
        } else if (selectedRange === "Last 6 months") {
          rangeStart.setMonth(rangeStart.getMonth() - 6);
        } else if (selectedRange === "Last 12 months") {
          rangeStart.setMonth(rangeStart.getMonth() - 12);
        } else {
          rangeStart.setMonth(0, 1);
          rangeStart.setHours(0, 0, 0, 0);
        }

        const batchesQuery = supabase
          .from("batches")
          .select("batch_id, crop_type, quantity_kg, status, registered_at")
          .eq("registered_by", userData.user.id)
          .gte("registered_at", rangeStart.toISOString())
          .order("registered_at", { ascending: false });
        const { data: batches, error: batchesError } = await batchesQuery;
        if (batchesError) throw batchesError;

        const batchIds = (batches || []).map((batch) => batch.batch_id);
        const { data: inspections, error: inspectionsError } = batchIds.length
          ? await supabase
            .from("inspections")
            .select("batch_id, inspected_at, certificate_issued, quality_grade")
            .in("batch_id", batchIds)
            .eq("certificate_issued", true)
          : { data: [], error: null };
        if (inspectionsError) throw inspectionsError;

        const batchById = new Map((batches || []).map((batch) => [batch.batch_id, batch]));
        const certificationByBatch = new Map((inspections || []).map((inspection) => [inspection.batch_id, inspection]));
        const certificationDurations = (inspections || [])
          .map((inspection) => {
            const batch = batchById.get(inspection.batch_id);
            if (!batch?.registered_at || !inspection.inspected_at) return null;
            return (new Date(inspection.inspected_at).getTime() - new Date(batch.registered_at).getTime()) / 86400000;
          })
          .filter((days): days is number => days !== null && days >= 0);

        const timeline: Array<{
          batch_id: string;
          state: "green" | "amber";
          text: string;
          date: string;
        }> = (batches || []).slice(0, 5).map((batch) => {
          const inspection = certificationByBatch.get(batch.batch_id);
          const state: "green" | "amber" = inspection ? "green" : "amber";

          return {
            batch_id: batch.batch_id,
            state,
            text: inspection ? "Certification issued" : "Batch registered",
            date: (inspection?.inspected_at || batch.registered_at)
              ? new Date(inspection?.inspected_at || batch.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "Date unavailable",
          };
        });

        setFarmerData({
          totalBatches: batches?.length || 0,
          certifiedBatches: inspections?.length || 0,
          totalProduceKg: (batches || []).reduce((total, batch) => total + Number(batch.quantity_kg || 0), 0),
          averageCertificationDays: certificationDurations.length
            ? certificationDurations.reduce((total, days) => total + days, 0) / certificationDurations.length
            : null,
          batches: (batches || []).map((batch) => {
            const inspection = certificationByBatch.get(batch.batch_id);
            return {
              batch_id: batch.batch_id,
              crop_type: batch.crop_type || "Other",
              quantity_kg: Number(batch.quantity_kg || 0),
              status: batch.status || "REGISTERED",
              registered_at: batch.registered_at,
              inspected_at: inspection?.inspected_at ?? null,
              quality_grade: inspection?.quality_grade ?? null,
            };
          }),
          timeline,
        });
      } catch (error) {
        const value = typeof error === "object" && error ? error as Record<string, unknown> : {};
        const message = typeof value.message === "string" ? value.message : error instanceof Error ? error.message : "Unknown farmer analytics query error";
        const code = typeof value.code === "string" ? value.code : null;
        console.warn("[AgriTrust Analytics] Farmer query failed", {
          message, code,
          details: typeof value.details === "string" ? value.details : null,
          hint: typeof value.hint === "string" ? value.hint : null,
        });
        setLoadError(code ? message + " [" + code + "]" : message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadFarmerAnalytics();
  }, [selectedRange]);

  const barData = useMemo(() => {
    const now = new Date();
    const monthCount = selectedRange === "Last 3 months"
      ? 3
      : selectedRange === "Last 6 months"
        ? 6
        : selectedRange === "Last 12 months"
          ? 12
          : now.getMonth() + 1;
    const months = Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - index), 1);
      return {
        key: date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0"),
        month: date.toLocaleString("en-US", { month: "short", year: monthCount > 6 ? "2-digit" : undefined }),
        certified: 0,
        pending: 0,
      };
    });
    const byKey = new Map(months.map((item) => [item.key, item]));
    for (const batch of farmerData.batches) {
      if (!batch.registered_at) continue;
      const date = new Date(batch.registered_at);
      if (!Number.isFinite(date.getTime())) continue;
      const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      const item = byKey.get(key);
      if (!item) continue;
      if (batch.inspected_at) item.certified += 1;
      else item.pending += 1;
    }
    return months;
  }, [farmerData.batches, selectedRange]);

  const pieData = useMemo(() => {
    const cropTotals = new Map<string, number>();
    for (const batch of farmerData.batches) {
      const crop = batch.crop_type || "Other";
      cropTotals.set(crop, (cropTotals.get(crop) ?? 0) + Number(batch.quantity_kg || 0));
    }
    const total = [...cropTotals.values()].reduce((sum, value) => sum + value, 0);
    if (total <= 0) return [];
    return [...cropTotals.entries()]
      .sort(([, first], [, second]) => second - first)
      .map(([name, value], index) => ({
        name,
        value: Number(((value / total) * 100).toFixed(1)),
        color: ["#3B82F6", "#22C55E", "#8B5CF6", "#6B6B80"][index % 4],
      }));
  }, [farmerData.batches]);


  const farmerStats: StatCardProps[] = [
    {
      icon: Leaf,
      value: isLoading ? "-" : String(farmerData.totalBatches),
      label: "Total batches",
      trend: "Current records",
      trendTone: "green",
      iconColor: "text-accent-green",
      bgClassName: "card-gradient-green",
      iconGlow: "glow-green",
      iconBg: "bg-accent-green/10",
    },
    {
      icon: ShieldCheck,
      value: isLoading || farmerData.totalBatches === 0
        ? isLoading ? "-" : "0%"
        : `${((farmerData.certifiedBatches / farmerData.totalBatches) * 100).toFixed(1)}%`,
      label: "Compliance rate",
      trend: "Current records",
      trendTone: "green",
      iconColor: "text-accent-green",
      bgClassName: "card-gradient-green",
      iconGlow: "glow-green",
      iconBg: "bg-accent-green/10",
    },
    {
      icon: Scale,
      value: isLoading ? "-" : `${farmerData.totalProduceKg.toLocaleString()} kg`,
      label: "Total produce traced",
      trend: "Current records",
      trendTone: "green",
      iconColor: "text-accent-blue",
      bgClassName: "card-gradient-blue",
      iconGlow: "glow-blue",
      iconBg: "bg-accent-blue/10",
    },
    {
      icon: Clock,
      value: isLoading
        ? "-"
        : farmerData.averageCertificationDays === null
          ? "N/A"
          : `${farmerData.averageCertificationDays.toFixed(1)} days`,
      label: "Avg. time to certification",
      trend: "Current records",
      trendTone: "green",
      iconColor: "text-accent-amber",
      bgClassName: "card-gradient-amber",
      iconGlow: "glow-amber",
      iconBg: "bg-accent-amber/10",
    },
  ];



  return (

    <div className="pb-8">

      <header className="mb-6 px-8 pt-8">

        <h1

          className="text-3xl font-bold text-agri-text"

          style={{ fontFamily: "var(--font-outfit)" }}

        >

          My Analytics

        </h1>

        <p className="mt-1 text-agri-muted">

          Track performance, compliance, and certification progress across your

          batches.

        </p>

      </header>



      {loadError ? (
        <div className="mx-8 mb-6 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
          Analytics could not be loaded: {loadError}
        </div>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-4 px-8 md:grid-cols-2 xl:grid-cols-4">

        {farmerStats.map((stat) => (

          <StatCard key={stat.label} {...stat} />

        ))}

      </section>



      <section className="mx-8 mb-6 rounded-xl glass p-6">

        <div className="mb-4 flex items-center justify-between">

          <h3 className="text-sm font-semibold text-agri-text">

            Monthly batch registrations

          </h3>

          <select
            className="rounded-lg border border-agri-border bg-agri-raised px-3 py-1.5 text-xs text-agri-text"
            value={selectedRange}
            onChange={(event) => setSelectedRange(event.target.value)}
          >
            <option>Last 3 months</option>
            <option>Last 6 months</option>
            <option>Last 12 months</option>
            <option>This year</option>
          </select>
        </div>

        <div className="h-72 w-full">

          <ResponsiveContainer width="100%" height="100%">

            <BarChart data={barData}>

              <CartesianGrid stroke="#2a2a3e" strokeDasharray="3 3" />

              <XAxis dataKey="month" tick={{ fill: "#6b6b80" }} fontSize={12} />
              <YAxis tick={{ fill: "#6b6b80" }} fontSize={12} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend iconType="circle" />

              <Bar dataKey="certified" fill="#22C55E" name="Certified" />

              <Bar dataKey="pending" fill="#F59E0B" name="Pending" />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </section>



      <section className="mx-8 mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">

        <div className="rounded-xl glass p-5">
          <h3 className="mb-4 text-sm font-semibold text-agri-text">
            Crop breakdown

          </h3>

          <div className="h-48">

            <ResponsiveContainer width="100%" height="100%">

              <PieChart>

                <Pie

                  data={pieData}

                  dataKey="value"

                  innerRadius={50}

                  outerRadius={80}

                  paddingAngle={2}

                >

                  {pieData.map((entry) => (

                    <Cell key={entry.name} fill={entry.color} />

                  ))}

                  <Label

                    value={`${farmerData.totalBatches || 0} Total batches`}

                    position="center"

                    style={{ fill: "#6b6b80", fontSize: 12 }}

                  />

                </Pie>

                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>

            </ResponsiveContainer>

          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-4">

            {pieData.map((entry) => (

              <div

                key={entry.name}

                className="flex items-center gap-1.5 text-xs text-agri-muted"

              >

                <span

                  className="h-2 w-2 rounded-full"

                  style={{ backgroundColor: entry.color }}

                />

                <span>{entry.name}</span>

                <span>{entry.value}%</span>

              </div>

            ))}

          </div>

        </div>



        <div className="rounded-xl glass p-5">
          <h3 className="mb-4 text-sm font-semibold text-agri-text">
            Compliance timeline

          </h3>

          {(farmerData.timeline.length ? farmerData.timeline : [{
            batch_id: "No data",
            state: "amber",
            text: "No batch activities recorded yet",
            date: "Awaiting data",
          }]).map((item) => ({
            id: item.batch_id,
            state: item.state,
            text: item.text,
            date: item.date,
          })).map((item) => (

            <div

              key={item.id}

              className="flex items-center gap-3 border-b border-agri-border py-2 last:border-0"

            >

              <span

                className={`h-2.5 w-2.5 rounded-full ${item.state === "green" ? "bg-accent-green" : "bg-accent-amber"}`}

              />

              <span

                className={`font-mono text-xs ${item.state === "green" ? "text-accent-green" : "text-accent-amber"}`}

              >

                {item.id}

              </span>

              <span className="text-sm text-agri-text">{item.text}</span>

              <span className="ml-auto text-xs text-agri-muted">

                {item.date}

              </span>

            </div>

          ))}

          <p className="mt-3 cursor-pointer text-sm text-agri-muted">

            View all timeline events →

          </p>

        </div>

      </section>



      <section className="mx-8 overflow-x-auto rounded-xl glass">

        <table className="min-w-full">

          <thead className="bg-agri-raised">

            <tr>

              {["Batch ID", "Crop", "Quantity", "Days to certify", "Grade"].map(

                (header) => (

                  <th

                    key={header}

                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-agri-muted"

                  >

                    {header}

                  </th>

                ),

              )}

            </tr>

          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-agri-muted">
                  Loading batch performance...
                </td>
              </tr>
            ) : farmerData.batches.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-agri-muted">
                  No batch performance records are available yet.
                </td>
              </tr>
            ) : (
              farmerData.batches.slice(0, 5).map((batch) => {
                const certificationDays =
                  batch.registered_at && batch.inspected_at
                    ? Math.max(
                        0,
                        Math.round(
                          (new Date(batch.inspected_at).getTime() -
                            new Date(batch.registered_at).getTime()) /
                            86400000,
                        ),
                      )
                    : null;

                return (
                  <tr
                    key={batch.batch_id}
                    className="border-b border-agri-border last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-sm font-bold text-agri-text">
                      {batch.batch_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-agri-text">{batch.crop_type}</td>
                    <td className="px-4 py-3 text-sm text-agri-text">
                      {batch.quantity_kg.toLocaleString()} kg
                    </td>
                    <td className="px-4 py-3 text-sm text-agri-text">
                      {certificationDays === null
                        ? "N/A"
                        : certificationDays + (certificationDays === 1 ? " day" : " days")}
                    </td>
                    <td className="px-4 py-3 text-sm text-agri-text">
                      {batch.quality_grade || "N/A"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

        </table>

      </section>



      <div className="mx-8 mt-4 flex items-center gap-2">

        <ShieldCheck className="h-3.5 w-3.5 text-agri-muted" />

        <p className="text-xs text-agri-muted">

          All analytics are anchored on the AgriTrust blockchain for

          transparency.

        </p>

      </div>

    </div>

  );

}



function RegulatorAnalytics() {

  const [activeRange, setActiveRange] = useState("30 days");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [regulatorData, setRegulatorData] = useState({
    activeFarms: 0,
    complianceRate: 0,
    activeFlags: 0,
    blockchainTransactions: 0,
    dailyRegistrations: [] as Array<{ date: string; count: number }>,
    dailyCertifications: [] as Array<{ date: string; count: number }>,
    cropBreakdown: [] as Array<{ crop: string; rate: number }>,
    regionFlags: [] as Array<{ name: string; count: number; tone: "red" | "amber" }>,
    inspectorSummary: [] as Array<{ id: string; region: string; batches: string; time: string; certs: string }>,
  });

  useEffect(() => {
    async function loadRegulatorAnalytics() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const days = activeRange === "7 days"
          ? 7
          : activeRange === "30 days"
            ? 30
            : activeRange === "90 days"
              ? 90
              : 365;
        const cutoff = Date.now() - days * 86400000;

        const [batchesResult, inspectionsResult, handoffsResult] = await Promise.all([
          supabase
            .from("batches")
            .select("batch_id, crop_type, status, registered_at, farm_id, tx_hash, farms(location)"),
          supabase
            .from("inspections")
            .select("batch_id, inspector_id, gmo_test_result, certificate_issued, tx_hash, inspected_at"),
          supabase
            .from("handoffs")
            .select("batch_id, tx_hash, handed_off_at"),
        ]);
        const queryError = batchesResult.error || inspectionsResult.error || handoffsResult.error;
        if (queryError) throw queryError;

        const validTime = (value: string | null) => {
          if (!value) return null;
          const timestamp = new Date(value).getTime();
          return Number.isFinite(timestamp) ? timestamp : null;
        };
        const allBatches = batchesResult.data ?? [];
        const batchMap = new Map(allBatches.map((batch) => [batch.batch_id, batch]));
        const batches = allBatches.filter((batch) => {
          const timestamp = validTime(batch.registered_at);
          return timestamp !== null && timestamp >= cutoff;
        });
        const batchIds = new Set(batches.map((batch) => batch.batch_id));
        const inspections = (inspectionsResult.data ?? []).filter((inspection) => {
          const timestamp = validTime(inspection.inspected_at);
          return timestamp !== null && timestamp >= cutoff && batchIds.has(inspection.batch_id);
        });
        const handoffs = (handoffsResult.data ?? []).filter((handoff) => {
          const timestamp = validTime(handoff.handed_off_at);
          return timestamp !== null && timestamp >= cutoff && batchIds.has(handoff.batch_id);
        });

        const certifiedIds = new Set(
          inspections
            .filter((inspection) => inspection.certificate_issued)
            .map((inspection) => inspection.batch_id),
        );
        const flaggedIds = new Set(
          batches
            .filter((batch) => batch.status === "FLAGGED")
            .map((batch) => batch.batch_id),
        );
        for (const inspection of inspections) {
          if (inspection.gmo_test_result === "GMO_PRESENT") flaggedIds.add(inspection.batch_id);
        }

        const registrationsByDay = new Map<string, number>();
        for (const batch of batches) {
          if (!batch.registered_at) continue;
          const key = new Date(batch.registered_at).toISOString().slice(0, 10);
          registrationsByDay.set(key, (registrationsByDay.get(key) ?? 0) + 1);
        }
        const certificationsByDay = new Map<string, number>();
        for (const inspection of inspections) {
          if (!inspection.certificate_issued || !inspection.inspected_at) continue;
          const key = new Date(inspection.inspected_at).toISOString().slice(0, 10);
          certificationsByDay.set(key, (certificationsByDay.get(key) ?? 0) + 1);
        }

        const cropTotals = new Map<string, { total: number; certified: number }>();
        for (const batch of batches) {
          const crop = batch.crop_type || "Other";
          const current = cropTotals.get(crop) ?? { total: 0, certified: 0 };
          current.total += 1;
          if (certifiedIds.has(batch.batch_id)) current.certified += 1;
          cropTotals.set(crop, current);
        }

        const regionFlags = new Map<string, number>();
        for (const batchId of flaggedIds) {
          const batch = batchMap.get(batchId);
          const farm = batch && (Array.isArray(batch.farms) ? batch.farms[0] : batch.farms);
          const region = farm?.location?.trim() || "Unspecified region";
          regionFlags.set(region, (regionFlags.get(region) ?? 0) + 1);
        }

        const inspectorMap = new Map<string, {
          count: number;
          certifications: number;
          totalDays: number;
          measured: number;
          regions: Set<string>;
        }>();
        for (const inspection of inspections) {
          const id = inspection.inspector_id || "Unassigned";
          const current = inspectorMap.get(id) ?? {
            count: 0,
            certifications: 0,
            totalDays: 0,
            measured: 0,
            regions: new Set<string>(),
          };
          current.count += 1;
          if (inspection.certificate_issued) current.certifications += 1;
          const batch = batchMap.get(inspection.batch_id);
          const registered = validTime(batch?.registered_at ?? null);
          const inspected = validTime(inspection.inspected_at);
          if (registered !== null && inspected !== null && inspected >= registered) {
            current.totalDays += (inspected - registered) / 86400000;
            current.measured += 1;
          }
          const farm = batch && (Array.isArray(batch.farms) ? batch.farms[0] : batch.farms);
          if (farm?.location?.trim()) current.regions.add(farm.location.trim());
          inspectorMap.set(id, current);
        }

        const transactionHashes = new Set<string>();
        for (const record of [...batches, ...inspections, ...handoffs]) {
          if (record.tx_hash) transactionHashes.add(record.tx_hash.toLowerCase());
        }

        setRegulatorData({
          activeFarms: new Set(batches.map((batch) => batch.farm_id).filter(Boolean)).size,
          complianceRate: batches.length ? (certifiedIds.size / batches.length) * 100 : 0,
          activeFlags: flaggedIds.size,
          blockchainTransactions: transactionHashes.size,
          dailyRegistrations: [...registrationsByDay.entries()].map(([date, count]) => ({ date, count })),
          dailyCertifications: [...certificationsByDay.entries()].map(([date, count]) => ({ date, count })),
          cropBreakdown: [...cropTotals.entries()]
            .map(([crop, stats]) => ({
              crop,
              rate: stats.total ? (stats.certified / stats.total) * 100 : 0,
            }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 5),
          regionFlags: [...regionFlags.entries()]
            .map(([name, count]) => ({ name, count, tone: count >= 10 ? "red" as const : "amber" as const }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
          inspectorSummary: [...inspectorMap.entries()]
            .map(([id, stats]) => ({
              id: id === "Unassigned" ? id : id.slice(0, 8),
              region: [...stats.regions].join(", ") || "Network",
              batches: String(stats.count),
              time: stats.measured ? (stats.totalDays / stats.measured).toFixed(1) + " days" : "N/A",
              certs: String(stats.certifications),
            }))
            .sort((a, b) => Number(b.batches) - Number(a.batches))
            .slice(0, 5),
        });
      } catch (error) {
        const value = typeof error === "object" && error ? error as Record<string, unknown> : {};
        const message = typeof value.message === "string"
          ? value.message
          : error instanceof Error ? error.message : "Unknown analytics query error";
        const code = typeof value.code === "string" ? value.code : null;
        console.warn("[AgriTrust Analytics] Regulator query failed", {
          message,
          code,
          details: typeof value.details === "string" ? value.details : null,
          hint: typeof value.hint === "string" ? value.hint : null,
        });
        setLoadError(code ? message + " [" + code + "]" : message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadRegulatorAnalytics();
  }, [activeRange]);

  const lineData = useMemo(() => {
    const registrations = new Map(
      regulatorData.dailyRegistrations.map((item) => [item.date, item.count]),
    );
    const certifications = new Map(
      regulatorData.dailyCertifications.map((item) => [item.date, item.count]),
    );

    if (activeRange === "12 months") {
      const values = Array.from({ length: 12 }, (_, index) => {
        const date = new Date();
        date.setUTCDate(1);
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCMonth(date.getUTCMonth() - (11 - index));
        return {
          key: date.toISOString().slice(0, 7),
          day: date.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
          registrations: 0,
          certifications: 0,
        };
      });
      for (const [date, count] of registrations) {
        const item = values.find((value) => value.key === date.slice(0, 7));
        if (item) item.registrations += count;
      }
      for (const [date, count] of certifications) {
        const item = values.find((value) => value.key === date.slice(0, 7));
        if (item) item.certifications += count;
      }
      return values;
    }

    const length = activeRange === "7 days" ? 7 : activeRange === "90 days" ? 90 : 30;
    return Array.from({ length }, (_, index) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (length - 1 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        day: date.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        registrations: registrations.get(key) ?? 0,
        certifications: certifications.get(key) ?? 0,
      };
    });
  }, [activeRange, regulatorData.dailyCertifications, regulatorData.dailyRegistrations]);

  const ranges = ["7 days", "30 days", "90 days", "12 months"];

  const regulatorStats: StatCardProps[] = [
    {
      icon: Users,
      value: isLoading ? "-" : String(regulatorData.activeFarms),
      label: "Active farms",
      trend: "Current records",
      trendTone: "green",
      iconColor: "text-accent-blue",
      bgClassName: "card-gradient-blue",
      iconGlow: "glow-blue",
      iconBg: "bg-accent-blue/10",
    },
    {
      icon: ShieldCheck,
      value: isLoading ? "-" : `${regulatorData.complianceRate.toFixed(1)}%`,
      label: "Network compliance rate",
      trend: "Current records",
      trendTone: "green",
      iconColor: "text-accent-green",
      bgClassName: "card-gradient-green",
      iconGlow: "glow-green",
      iconBg: "bg-accent-green/10",
    },
    {
      icon: Flag,
      value: isLoading ? "-" : String(regulatorData.activeFlags),
      label: "Active non-compliance flags",
      trend: "Current records",
      trendTone: "green",
      iconColor: "text-accent-red",
      bgClassName: "bg-gradient-to-br from-accent-red/8 to-agri-surface/95",
      iconGlow: "shadow-[0_0_24px_rgba(239,68,68,0.25)]",
      iconBg: "bg-accent-red/10",
    },
    {
      icon: Box,
      value: isLoading ? "-" : String(regulatorData.blockchainTransactions),
      label: "Blockchain transactions",
      trend: "Current records",
      trendTone: "green",
      iconColor: "text-accent-purple",
      bgClassName: "card-gradient-purple",
      iconGlow: "glow-purple",
      iconBg: "bg-accent-purple/10",
    },
  ];

  return (

    <div className="pb-8">
      <header className="mb-6 px-8 pt-8">

        <h1
          className="text-3xl font-bold text-agri-text"

          style={{ fontFamily: "var(--font-outfit)" }}
        >

          Network Analytics

        </h1>

        <p className="mt-1 text-agri-muted">

          Monitor ecosystem health, compliance trends, and inspector output

          across the network.

        </p>

      </header>



      <div className="mb-6 flex gap-2 px-8">

        {ranges.map((range) => (

          <button

            key={range}

            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeRange === range ? "bg-accent-blue text-white" : "border border-agri-border text-agri-muted"}`}

            type="button"

            onClick={() => setActiveRange(range)}

          >

            {range}

          </button>

        ))}

      </div>



      {loadError ? (
        <div className="mx-8 mb-6 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
          Analytics could not be loaded: {loadError}
        </div>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-4 px-8 md:grid-cols-2 xl:grid-cols-4">
        {regulatorStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>



      <section className="mx-8 mb-6 h-72 rounded-xl glass p-6">

        <div className="mb-4 flex items-center justify-between">

          <h3 className="text-sm font-semibold text-agri-text">

            Daily registrations vs certifications

          </h3>

          <span className="text-xs text-agri-muted">{activeRange}</span>

        </div>

        <ResponsiveContainer width="100%" height="100%">

          <LineChart data={lineData}>

            <CartesianGrid stroke="#2a2a3e" strokeDasharray="3 3" />

            <XAxis
              dataKey="day"
              tick={{ fill: "#6b6b80" }}
              fontSize={12}
              interval={4}
            />
            <YAxis tick={{ fill: "#6b6b80" }} fontSize={12} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend />

            <Line

              type="monotone"

              dataKey="registrations"

              stroke="#3B82F6"

              strokeWidth={2}

              name="New registrations"

            />

            <Line

              type="monotone"

              dataKey="certifications"

              stroke="#22C55E"

              strokeWidth={2}

              name="Certifications issued"

            />

          </LineChart>

        </ResponsiveContainer>

      </section>



      <section className="mx-8 mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl glass p-5">

          <h3 className="mb-4 text-sm font-semibold text-agri-text">

            Compliance by crop type

          </h3>

          <div className="h-52">

            <ResponsiveContainer width="100%" height="100%">

              <BarChart

                data={regulatorData.cropBreakdown.length ? regulatorData.cropBreakdown : [{ crop: "No data", rate: 0 }]}

                layout="vertical"

                margin={{ top: 0, right: 24, bottom: 0, left: 8 }}

              >

                <CartesianGrid stroke="#2a2a3e" strokeDasharray="3 3" />

                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: "#6b6b80" }}
                  fontSize={12}
                />
                <YAxis
                  dataKey="crop"
                  type="category"
                  width={70}
                  tick={{ fill: "#6b6b80" }}
                  fontSize={12}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="rate" fill="#22C55E" radius={[0, 4, 4, 0]} />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>



        <div className="rounded-xl glass p-5">
          <h3 className="mb-4 text-sm font-semibold text-agri-text">
            Non-compliance by region

          </h3>

          {(regulatorData.regionFlags.length ? regulatorData.regionFlags : [{ name: "No data", count: 0, tone: "amber" }]).map((item, index) => (

            <div

              key={item.name}

              className="flex items-center gap-3 border-b border-agri-border py-3 last:border-0"

            >

              <span className="w-5 text-sm font-bold text-agri-muted">

                {index + 1}

              </span>

              <span className="flex-1 text-sm text-agri-text">{item.name}</span>

              <span

                className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.count >= 10 ? "bg-accent-red/20 text-accent-red" : "bg-accent-amber/20 text-accent-amber"}`}

              >

                {item.count}

              </span>

              <button className="text-xs text-accent-blue" type="button">

                Review

              </button>

            </div>

          ))}

        </div>

      </section>



      <section className="mx-8 overflow-x-auto rounded-xl glass">

        <table className="min-w-full">

          <thead className="bg-agri-raised">

            <tr>

              {[

                "Inspector ID",

                "Region",

                "Batches inspected",

                "Avg time",

                "Certifications",

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

            {(regulatorData.inspectorSummary.length ? regulatorData.inspectorSummary : [{ id: "No data", region: "Network", batches: "0", time: "N/A", certs: "0" }]).map((row) => (

              <tr

                key={row.id}

                className="border-b border-agri-border last:border-0"

              >

                <td className="px-4 py-3 font-mono text-sm font-bold text-agri-text">

                  {row.id}

                </td>

                <td className="px-4 py-3 text-sm text-agri-text">

                  {row.region}

                </td>

                <td className="px-4 py-3 text-sm text-agri-text">

                  {row.batches}

                </td>

                <td className="px-4 py-3 text-sm text-agri-text">{row.time}</td>

                <td className="px-4 py-3 text-sm text-accent-blue">

                  {row.certs}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </section>

    </div >

  );

}



export default function AnalyticsPage() {
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
        console.warn("[AgriTrust Analytics] Role query failed", {
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

  if (roleError) {
    return (
      <div className="m-8 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
        Analytics access could not be verified: {roleError}
      </div>
    );
  }
  if (!role) {
    return <p className="px-8 py-10 text-sm text-agri-muted">Loading analytics...</p>;
  }
  if (role === "REGULATOR") return <RegulatorAnalytics />;
  return <FarmerAnalytics />;
}
