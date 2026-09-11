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
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${iconBg} ${iconGlow}`}>
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
  });

  useEffect(() => {
    async function loadFarmerAnalytics() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: batches, error: batchesError } = await supabase
          .from("batches")
          .select("batch_id, quantity_kg, registered_at")
          .eq("registered_by", userData.user.id);
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

        setFarmerData({
          totalBatches: batches?.length || 0,
          certifiedBatches: inspections?.length || 0,
          totalProduceKg: (batches || []).reduce((total, batch) => total + Number(batch.quantity_kg || 0), 0),
          averageCertificationDays: certificationDurations.length
            ? certificationDurations.reduce((total, days) => total + days, 0) / certificationDurations.length
            : null,
        });
      } catch (error) {
        console.error("Error loading farmer analytics:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFarmerAnalytics();
  }, []);

  const barData = [
    { month: "Dec", certified: 12, pending: 3 },

    { month: "Jan", certified: 18, pending: 4 },

    { month: "Feb", certified: 15, pending: 2 },

    { month: "Mar", certified: 20, pending: 3 },

    { month: "Apr", certified: 16, pending: 2 },

    { month: "May", certified: 21, pending: 3 },

  ];



  const pieData = [

    { name: "Cocoa", value: 42, color: "#3B82F6" },

    { name: "Cassava", value: 28, color: "#22C55E" },

    { name: "Cashew", value: 18, color: "#8B5CF6" },

    { name: "Others", value: 12, color: "#6B6B80" },

  ];



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

                    value="14 Total batches"

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

          {[

            {

              id: "AGT-0042",

              state: "green",

              text: "Certification issued",

              date: "Jun 17",

            },

            {

              id: "AGT-0044",

              state: "green",

              text: "Inspection passed",

              date: "Jun 12",

            },

            {

              id: "AGT-0041",

              state: "amber",

              text: "Pending inspection",

              date: "Jun 10",

            },

            {

              id: "AGT-0038",

              state: "green",

              text: "Delivered to market",

              date: "Jun 08",

            },

            {

              id: "AGT-0040",

              state: "amber",

              text: "Awaiting inspector",

              date: "Jun 05",

            },

          ].map((item) => (

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
  });

  useEffect(() => {
    async function loadRegulatorAnalytics() {
      try {
        const [farmsResult, batchesResult, certifiedResult, flagsResult, auditResult] = await Promise.all([
          supabase.from("farms").select("id", { count: "exact", head: true }),
          supabase.from("batches").select("id", { count: "exact", head: true }),
          supabase.from("batches").select("id", { count: "exact", head: true }).eq("status", "CERTIFIED"),
          supabase.from("batches").select("id", { count: "exact", head: true }).eq("status", "FLAGGED"),
          supabase.from("audit_logs").select("id", { count: "exact", head: true }),
        ]);
        const queryError = farmsResult.error || batchesResult.error || certifiedResult.error || flagsResult.error || auditResult.error;
        if (queryError) throw queryError;

        const totalBatches = batchesResult.count || 0;
        setRegulatorData({
          activeFarms: farmsResult.count || 0,
          complianceRate: totalBatches ? ((certifiedResult.count || 0) / totalBatches) * 100 : 0,
          activeFlags: flagsResult.count || 0,
          blockchainTransactions: auditResult.count || 0,
        });
      } catch (error) {
        console.error("Error loading regulator analytics:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadRegulatorAnalytics();
  }, []);

  const lineData = useMemo(

    () =>

      Array.from({ length: 30 }, (_, index) => ({

        day: `Jun ${index + 1}`,

        registrations: 20 + Math.floor(index * 0.8) + (index * 3) % 8,

        certifications: 15 + Math.floor(index * 0.7) + (index * 5) % 7,

      })),

    [],

  );



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

                data={[

                  { crop: "Cocoa", rate: 99.1 },

                  { crop: "Cassava", rate: 97.8 },

                  { crop: "Maize", rate: 95.4 },

                  { crop: "Cashew", rate: 92.3 },

                  { crop: "Soybean", rate: 87.0 },

                ]}

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

          {[

            { name: "Kano", count: 12, tone: "red" },

            { name: "Kaduna", count: 9, tone: "amber" },

            { name: "Nasarawa", count: 7, tone: "amber" },

            { name: "Oyo", count: 6, tone: "amber" },

            { name: "Delta", count: 5, tone: "amber" },

          ].map((item, index) => (

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

            {[

              {

                id: "NAFDAC-0042",

                region: "Rivers",

                batches: "178",

                time: "2.3 days",

                certs: "162",

              },

              {

                id: "NAFDAC-0039",

                region: "Lagos",

                batches: "156",

                time: "2.1 days",

                certs: "149",

              },

              {

                id: "NAFDAC-0031",

                region: "Oyo",

                batches: "134",

                time: "2.6 days",

                certs: "121",

              },

              {

                id: "NAFDAC-0022",

                region: "Kano",

                batches: "128",

                time: "2.8 days",

                certs: "110",

              },

              {

                id: "NAFDAC-0018",

                region: "Kaduna",

                batches: "114",

                time: "3.2 days",

                certs: "98",

              },

            ].map((row) => (

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
