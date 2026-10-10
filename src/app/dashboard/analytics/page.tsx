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
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: batches, error: batchesError } = await supabase
          .from("batches")
          .select("batch_id, crop_type, quantity_kg, status, registered_at")
          .eq("registered_by", userData.user.id)
          .order("registered_at", { ascending: false });
        if (batchesError) throw batchesError;

        const batchIds = (batches || []).map((batch) => batch.batch_id);
        const { data: inspections, error: inspectionsError } = batchIds.length
          ? await supabase
            .from("inspections")
            .select("batch_id, inspected_at, certificate_issued")
            .in("batch_id", batchIds)
            .eq("certificate_issued", true)
          : { data: [], error: null };
        if (inspectionsError) throw inspectionsError;

        const batchById = new Map((batches || []).map((batch) => [batch.batch_id, batch]));
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
          const state: "green" | "amber" = batch.status === "CERTIFIED" ? "green" : "amber";

          return {
            batch_id: batch.batch_id,
            state,
            text: batch.status === "CERTIFIED" ? "Certification issued" : "Batch registered",
            date: batch.registered_at ? new Date(batch.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent",
          };
        });

        setFarmerData({
          totalBatches: batches?.length || 0,
          certifiedBatches: inspections?.length || 0,
          totalProduceKg: (batches || []).reduce((total, batch) => total + Number(batch.quantity_kg || 0), 0),
          averageCertificationDays: certificationDurations.length
            ? certificationDurations.reduce((total, days) => total + days, 0) / certificationDurations.length
            : null,
          batches: (batches || []).map((batch) => ({
            batch_id: batch.batch_id,
            crop_type: batch.crop_type || "Other",
            quantity_kg: Number(batch.quantity_kg || 0),
            status: batch.status || "REGISTERED",
            registered_at: batch.registered_at,
          })),
          timeline,
        });
      } catch (error) {
        console.error("Error loading farmer analytics:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFarmerAnalytics();
  }, []);

  const barData = useMemo(() => {
    const monthOrder = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    const currentMonth = new Date();

    const monthlyMap = new Map(
      monthOrder.map((month, index) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (monthOrder.length - 1 - index), 1);
        return [month, { month, certified: 0, pending: 0, date }];
      }),
    );

    const batchesByMonth = new Map<string, { certified: number; pending: number }>();

    for (const batch of (farmerData?.batches ?? [])) {
      const safeDate = batch.registered_at ? new Date(batch.registered_at) : new Date("2024-01-01T00:00:00.000Z");
      const monthLabel = safeDate.toLocaleString("en-US", { month: "short" });
      const existing = batchesByMonth.get(monthLabel) ?? { certified: 0, pending: 0 };
      if (batch.status === "CERTIFIED" || batch.status === "INSPECTED") {
        existing.certified += 1;
      } else {
        existing.pending += 1;
      }
      batchesByMonth.set(monthLabel, existing);
    }

    return monthOrder.map((month) => {
      const aggregate = batchesByMonth.get(month) ?? { certified: 0, pending: 0 };
      return { month, certified: aggregate.certified, pending: aggregate.pending };
    });
  }, [farmerData]);

  const pieData = useMemo(() => {
    const cropTotals = new Map<string, number>();

    for (const batch of farmerData.batches) {
      const crop = batch.crop_type || "Other";
      cropTotals.set(crop, (cropTotals.get(crop) ?? 0) + Number(batch.quantity_kg || 0));
    }

    const entries = [...cropTotals.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([name, value], index) => ({
        name,
        value: Math.max(1, Math.round((value / (Array.from(cropTotals.values()).reduce((sum, current) => sum + current, 0) || 1)) * 100)),
        color: ["#3B82F6", "#22C55E", "#8B5CF6", "#6B6B80"][index % 4],
      }));

    const totalValue = entries.reduce((sum, entry) => sum + entry.value, 0);
    if (totalValue < 100 && entries.length > 0) {
      entries[entries.length - 1].value += 100 - totalValue;
    }

    return entries.length ? entries : [{ name: "No data", value: 100, color: "#6B6B80" }];
  }, [farmerData]);



  const farmerStats: StatCardProps[] = [
    {
      icon: Leaf,
      value: isLoading ? "-" : String(farmerData.totalBatches),
      label: "Total batches",
      trend: "+6.4% vs last 6 months",
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
      trend: "+2.3% vs last 6 months",
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
      trend: "+1,120 kg",
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
          ? "—"
          : `${farmerData.averageCertificationDays.toFixed(1)} days`,
      label: "Avg. time to certification",
      trend: "−0.6 days",
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



      <section className="mx-8 overflow-hidden rounded-xl glass">

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

            {[

              {

                id: "AGT-0042",

                crop: "Grade A Cocoa",

                quantity: "500 kg",

                days: "3 days",

                tone: "green",

                grade: "A+",

              },

              {

                id: "AGT-0044",

                crop: "Sesame Seeds",

                quantity: "1,000 kg",

                days: "4 days",

                tone: "green",

                grade: "A",

              },

              {

                id: "AGT-0038",

                crop: "Cassava",

                quantity: "800 kg",

                days: "5 days",

                tone: "green",

                grade: "A",

              },

              {

                id: "AGT-0047",

                crop: "Ginger",

                quantity: "300 kg",

                days: "8 days",

                tone: "amber",

                grade: "B+",

              },

              {

                id: "AGT-0035",

                crop: "Cashew",

                quantity: "300 kg",

                days: "10 days",

                tone: "amber",

                grade: "B+",

              },

            ].map((row) => (

              <tr

                key={row.id}

                className="border-b border-agri-border last:border-0"

              >

                <td className="px-4 py-3 font-mono text-sm font-bold text-agri-text">

                  {row.id}

                </td>

                <td className="px-4 py-3 text-sm text-agri-text">{row.crop}</td>

                <td className="px-4 py-3 text-sm text-agri-text">

                  {row.quantity}

                </td>

                <td className="px-4 py-3 text-sm">

                  <span

                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.tone === "green" ? "bg-accent-green/20 text-accent-green" : "bg-accent-amber/20 text-accent-amber"}`}

                  >

                    {row.days}

                  </span>

                </td>

                <td className="px-4 py-3 text-sm text-agri-text">

                  {row.grade}

                </td>

              </tr>

            ))}

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
      try {
        const [farmsResult, batchesResult, certifiedResult, flagsResult, auditResult, inspectionsResult] = await Promise.all([
          supabase.from("farms").select("id, region", { count: "exact" }),
          supabase.from("batches").select("id, crop_type, status, registered_at, farm_id", { count: "exact" }),
          supabase.from("batches").select("id", { count: "exact", head: true }).eq("status", "CERTIFIED"),
          supabase.from("batches").select("id", { count: "exact", head: true }).eq("status", "FLAGGED"),
          supabase.from("audit_logs").select("id", { count: "exact", head: true }),
          supabase.from("inspections").select("id, batch_id, inspector_id, created_at, passed"),
        ]);
        const queryError = farmsResult.error || batchesResult.error || certifiedResult.error || flagsResult.error || auditResult.error || inspectionsResult.error;
        if (queryError) throw queryError;

        const totalBatches = batchesResult.count || 0;
        const batches = batchesResult.data ?? [];
        const inspections = inspectionsResult.data ?? [];
        const farmRegions = (farmsResult.data ?? []).map((farm) => farm.region).filter(Boolean) as string[];

        const registrationsByDay = new Map<string, number>();
        const certificationsByDay = new Map<string, number>();
        for (const batch of batches) {
          const dayKey = batch.registered_at ? new Date(batch.registered_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
          registrationsByDay.set(dayKey, (registrationsByDay.get(dayKey) ?? 0) + 1);
        }
        for (const inspection of inspections) {
          const dayKey = inspection.created_at ? new Date(inspection.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
          if (inspection.passed) {
            certificationsByDay.set(dayKey, (certificationsByDay.get(dayKey) ?? 0) + 1);
          }
        }

        const cropTotals = new Map<string, { total: number; certified: number }>();
        for (const batch of batches) {
          const crop = String(batch.crop_type || "Other");
          const current = cropTotals.get(crop) ?? { total: 0, certified: 0 };
          current.total += 1;
          if (batch.status === "CERTIFIED") current.certified += 1;
          cropTotals.set(crop, current);
        }

        const regionCounts = new Map<string, number>();
        for (const farm of farmsResult.data ?? []) {
          const regionName = String(farm.region || "Unassigned");
          regionCounts.set(regionName, (regionCounts.get(regionName) ?? 0) + 1);
        }

        const flaggedRegions = [...regionCounts.entries()]
          .map(([name, count]) => ({ name, count, tone: count >= 10 ? "red" as const : "amber" as const }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const inspectorMap = new Map<string, { count: number; certs: number; region: string }>();
        for (const inspection of inspections) {
          const inspectorId = inspection.inspector_id || "unknown";
          const current = inspectorMap.get(inspectorId) ?? { count: 0, certs: 0, region: "Network" };
          current.count += 1;
          if (inspection.passed) current.certs += 1;
          inspectorMap.set(inspectorId, current);
        }

        const inspectorSummary = [...inspectorMap.entries()]
          .map(([id, stats]) => ({
            id: id.slice(0, 8),
            region: farmRegions[0] || "Network",
            batches: String(stats.count),
            time: `${Math.max(1, Math.min(5, stats.count)).toFixed(1)} days`,
            certs: String(stats.certs),
          }))
          .sort((a, b) => Number(b.batches) - Number(a.batches))
          .slice(0, 5);

        setRegulatorData({
          activeFarms: farmsResult.count || 0,
          complianceRate: totalBatches ? ((certifiedResult.count || 0) / totalBatches) * 100 : 0,
          activeFlags: flagsResult.count || 0,
          blockchainTransactions: auditResult.count || 0,
          dailyRegistrations: [...registrationsByDay.entries()].map(([date, count]) => ({ date, count })),
          dailyCertifications: [...certificationsByDay.entries()].map(([date, count]) => ({ date, count })),
          cropBreakdown: [...cropTotals.entries()].map(([crop, stats]) => ({
            crop,
            rate: stats.total ? ((stats.certified / stats.total) * 100) : 0,
          })).sort((a, b) => b.rate - a.rate).slice(0, 5),
          regionFlags: flaggedRegions,
          inspectorSummary,
        });
      } catch (error) {
        console.error("Error loading regulator analytics:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadRegulatorAnalytics();
  }, []);

  const lineData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      return {
        day: date.toLocaleString("en-US", { month: "short", day: "numeric" }),
        registrations: 0,
        certifications: 0,
      };
    });

    const rawRegistrations = regulatorData.dailyRegistrations ?? [];
    const rawCertifications = regulatorData.dailyCertifications ?? [];

    for (const item of rawRegistrations) {
      const label = new Date(item.date).toLocaleString("en-US", { month: "short", day: "numeric" });
      const match = days.find((entry) => entry.day === label);
      if (match) match.registrations = Number(item.count ?? 0);
    }

    for (const item of rawCertifications) {
      const label = new Date(item.date).toLocaleString("en-US", { month: "short", day: "numeric" });
      const match = days.find((entry) => entry.day === label);
      if (match) match.certifications = Number(item.count ?? 0);
    }

    return days;
  }, [regulatorData]);



  const ranges = ["7 days", "30 days", "90 days", "12 months"];

  const regulatorStats: StatCardProps[] = [
    {
      icon: Users,
      value: isLoading ? "-" : String(regulatorData.activeFarms),
      label: "Active farms",
      trend: "+2.6% this month",
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
      trend: "+2.6%",
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
      trend: "▼ 8 resolved",
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
      trend: "+15.3%",
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
                  domain={[80, 100]}
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



      <section className="mx-8 overflow-hidden rounded-xl glass">

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

            {(regulatorData.inspectorSummary.length ? regulatorData.inspectorSummary : [{ id: "No data", region: "Network", batches: "0", time: "0.0 days", certs: "0" }]).map((row) => (

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

  useEffect(() => {
    async function loadRole() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();
      setRole(profile?.role as UserRole | null);
    }
    loadRole();
  }, []);

  if (role === "REGULATOR") return <RegulatorAnalytics />;
  return <FarmerAnalytics />;
}
