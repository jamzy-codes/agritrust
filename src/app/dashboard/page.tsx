"use client";

import {
  AlertTriangle,
  Award,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Link as ChainLink,
  ShieldCheck,
  Sprout,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PRIMARY_BATCH, PRIMARY_USER } from "@/lib/mockData";
import type { UserRole } from "@/types";
import { MiniTimeline } from "@/components/ui/MiniTimeline";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";


const batchRows = [
  { id: PRIMARY_BATCH.batchId, crop: `${PRIMARY_BATCH.cropType} · ${PRIMARY_BATCH.quantityKg} kg` },
  { id: "AGT-0041", crop: "Cassava · 800 kg" },
  { id: "AGT-0039", crop: "Cashew · 300 kg" },
];

const regionData = [
  { state: "Rivers State", compliance: 99.1 },
  { state: "Lagos", compliance: 98.4 },
  { state: "Kano", compliance: 97.6 },
  { state: "Oyo", compliance: 96.8 },
  { state: "Kaduna", compliance: 95.3 },
];

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  iconBg: string;
  iconColor: string;
  glow: string;
  bgClassName?: string;
  iconGlow?: string;
}

function GradientCard({
  children,
  className = "",
  bgClassName = "bg-agri-surface/95",
}: {
  children: React.ReactNode;
  className?: string;
  bgClassName?: string;
}) {
  return (
    <div className={`rounded-xl bg-linear-to-br from-agri-border via-agri-border/60 to-transparent p-px ${className}`}>
      <div className={`h-full rounded-xl ${bgClassName} shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-sm`}>
        {children}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, iconBg, iconColor, glow, bgClassName, iconGlow }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
      <div className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl ${glow}`} />
      <div className={`pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full blur-3xl ${glow}`} />
      <GradientCard bgClassName={bgClassName}>
        <div className="relative flex items-center gap-4 p-5">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg} ${iconGlow}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-3xl font-bold text-agri-text">{value}</p>
            <p className="mt-0.5 text-sm text-agri-muted">{label}</p>
          </div>
        </div>
      </GradientCard>
    </div>
  );
}

function FarmerDashboard() {
  const firstName = PRIMARY_USER.name.split(" ")[0];
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const stats: StatCardProps[] = [
    {
      icon: Sprout,
      value: "8",
      label: "Active batches",
      iconBg: "bg-accent-green/10",
      iconColor: "text-accent-green",
      glow: "bg-accent-green/8",
      bgClassName: "card-gradient-green",
      iconGlow: "glow-green",
    },
    {
      icon: ShieldCheck,
      value: "6",
      label: "Certified compliant",
      iconBg: "bg-accent-blue/10",
      iconColor: "text-accent-blue",
      glow: "bg-accent-blue/8",
      bgClassName: "card-gradient-blue",
      iconGlow: "glow-blue",
    },
    {
      icon: Clock,
      value: "2",
      label: "Awaiting inspection",
      iconBg: "bg-accent-amber/10",
      iconColor: "text-accent-amber",
      glow: "bg-accent-amber/8",
      bgClassName: "card-gradient-amber",
      iconGlow: "glow-amber",
    },
    {
      icon: ChainLink,
      value: "14",
      label: "Total registered",
      iconBg: "bg-accent-purple/10",
      iconColor: "text-accent-purple",
      glow: "bg-accent-purple/8",
      bgClassName: "card-gradient-purple",
      iconGlow: "glow-purple",
    },
  ];
  const upcomingActions = [
    {
      id: "agt-0041-inspection",
      icon: AlertTriangle,
      color: "text-accent-amber",
      task: "AGT-0041 awaiting inspection",
      due: "Due Jun 25",
    },
    {
      id: "q2-practices-report",
      icon: FileText,
      color: "text-accent-blue",
      task: "Submit Q2 farming practices report",
      due: "Due Jun 30",
    },
    {
      id: "nasc-renewal",
      icon: Bell,
      color: "text-accent-purple",
      task: "Renew NASC seed certification",
      due: "Due Jul 15",
    },
  ];

  function completeAction(actionId: string) {
    setCompletedActions((current) =>
      current.includes(actionId) ? current : [...current, actionId],
    );
  }

  return (
    <div className="pb-8">
      <header className="mb-8 flex items-start justify-between p-8 pb-0">
        <div>
          <h1
            className="text-3xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Good morning, {firstName}
          </h1>
          <p className="mt-1 text-agri-muted">Here&apos;s your farm activity overview.</p>
        </div>
        <Link
          className="flex items-center gap-2 rounded-xl bg-accent-green px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(34,197,94,0.18)] hover:bg-accent-green/90"
          href="/dashboard/register"
        >
          <Sprout className="h-4 w-4" />
          Register New Batch
        </Link>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 px-8 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="mx-8 mb-6">
        <GradientCard bgClassName="glass">
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-agri-text">Your active supply chains</h2>
            <div className="divide-y divide-agri-border">
              {batchRows.map((batch) => (
                <div key={batch.id} className="flex items-center gap-6 py-4">
                  <div className="min-w-40">
                    <Link
                      className="font-mono text-sm font-bold text-agri-text hover:text-accent-blue"
                      href={`/dashboard/trace/${batch.id}`}
                    >
                      {batch.id}
                    </Link>
                    <p className="mt-0.5 text-xs text-agri-muted">{batch.crop}</p>
                  </div>
                  <div className="flex-1">
                    <MiniTimeline stages={["complete", "complete", "complete", "current", "pending"]} />
                  </div>
                  <span className="rounded-full bg-accent-amber/20 px-3 py-1 text-xs font-bold text-accent-amber">
                    IN TRANSIT
                  </span>
                </div>
              ))}
            </div>
          </div>
        </GradientCard>
      </section>

      <section className="mx-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GradientCard bgClassName="glass">
          <div className="p-5">
            <h3 className="mb-4 text-base font-semibold text-agri-text">Recent certifications</h3>
            {[
              ["AGT-0042 Biosafety Certificate", "NAFDAC-0042 · Jun 17, 2026"],
              ["AGT-0038 Compliance Certificate", "NAFDAC-0039 · Jun 10, 2026"],
              ["AGT-0035 Quality Grade Certificate", "NAFDAC-0031 · Jun 03, 2026"],
            ].map(([title, meta]) => (
              <div key={title} className="flex items-start gap-3 border-b border-agri-border py-3 last:border-0">
                <Award className="h-4.5 w-4.5 shrink-0 text-accent-purple" />
                <div>
                  <p className="text-sm font-medium text-agri-text">{title}</p>
                  <p className="text-xs text-agri-muted">{meta}</p>
                  <span className="mt-2 inline-flex rounded-full bg-accent-green/20 px-2 py-0.5 text-xs font-bold text-accent-green">
                    Active
                  </span>
                </div>
              </div>
            ))}
            <Link className="mt-3 block text-sm text-accent-green" href="/dashboard/compliance">
              View all certifications →
            </Link>
          </div>
        </GradientCard>

        <GradientCard bgClassName="glass">
          <div className="p-5">
            <h3 className="mb-4 text-base font-semibold text-agri-text">Upcoming actions</h3>
            {upcomingActions.map(({ id, icon: Icon, color, task, due }) => {
              const isComplete = completedActions.includes(id);

              return (
                <div key={id} className="flex items-start gap-3 border-b border-agri-border py-3 last:border-0">
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${color}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isComplete ? "text-agri-muted line-through" : "text-agri-text"}`}>
                      {task}
                    </p>
                    <p className="text-xs text-agri-muted">{due}</p>
                  </div>
                  <button
                    className="text-xs text-accent-blue"
                    type="button"
                    onClick={() => completeAction(id)}
                    aria-label={isComplete ? `${task} completed` : `Complete ${task}`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-accent-green" />
                    ) : (
                      "Complete"
                    )}
                  </button>
                </div>
              );
            })}
            <Link className="mt-3 block text-sm text-agri-muted transition-colors hover:text-agri-text" href="/dashboard/alerts">
              View all actions →
            </Link>
          </div>
        </GradientCard>
      </section>
    </div>
  );
}

function RegulatorDashboard() {
  const stats: StatCardProps[] = [
    {
      icon: CheckCircle2,
      value: "4,217",
      label: "Compliant batches",
      iconBg: "bg-accent-green/10",
      iconColor: "text-accent-green",
      glow: "bg-accent-green/8",
      bgClassName: "card-gradient-green",
      iconGlow: "glow-green",
    },
    {
      icon: AlertTriangle,
      value: "38",
      label: "Flagged for review",
      iconBg: "bg-accent-amber/10",
      iconColor: "text-accent-amber",
      glow: "bg-accent-amber/8",
      bgClassName: "card-gradient-amber",
      iconGlow: "glow-amber",
    },
    {
      icon: XCircle,
      value: "6",
      label: "Non-compliance alerts",
      iconBg: "bg-accent-red/10",
      iconColor: "text-accent-red",
      glow: "bg-accent-red/8",
      bgClassName: "bg-gradient-to-br from-accent-red/8 to-agri-surface/95",
      iconGlow: "shadow-[0_0_24px_rgba(239,68,68,0.25)]",
    },
    {
      icon: Globe,
      value: "1,204",
      label: "Active farms registered",
      iconBg: "bg-accent-blue/10",
      iconColor: "text-accent-blue",
      glow: "bg-accent-blue/8",
      bgClassName: "card-gradient-blue",
      iconGlow: "glow-blue",
    },
  ];

  const greenDots = [
    "left-[18%] top-[24%]",
    "left-[26%] top-[42%]",
    "left-[36%] top-[30%]",
    "left-[45%] top-[54%]",
    "left-[56%] top-[36%]",
    "left-[63%] top-[62%]",
    "left-[71%] top-[45%]",
    "left-[77%] top-[28%]",
    "left-[21%] top-[65%]",
    "left-[32%] top-[72%]",
    "left-[49%] top-[22%]",
    "left-[54%] top-[76%]",
    "left-[66%] top-[18%]",
    "left-[82%] top-[58%]",
    "left-[14%] top-[48%]",
    "left-[40%] top-[82%]",
    "left-[72%] top-[74%]",
    "left-[88%] top-[39%]",
  ];
  const amberDots = [
    "left-[29%] top-[23%]",
    "left-[58%] top-[48%]",
    "left-[69%] top-[33%]",
    "left-[22%] top-[78%]",
    "left-[83%] top-[69%]",
    "left-[43%] top-[64%]",
  ];
  const redDots = ["left-[34%] top-[52%]", "left-[74%] top-[59%]"];

  return (
    <div className="px-8 pb-8 pt-8">
      <header className="mb-8">
        <h1
          className="text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Network Overview
        </h1>
        <p className="mt-1 text-agri-muted">Live compliance visibility across the AgriTrust network.</p>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="mb-6">
        <GradientCard>
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-agri-text">Compliance network map</h2>
              <p className="text-xs text-agri-muted">Live data from blockchain state.</p>
            </div>
            <div className="relative h-64 overflow-hidden rounded-lg bg-agri-raised">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.08),transparent_60%)]" />
              <span className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-6xl font-bold text-agri-muted/30">
                Nigeria
              </span>
              {greenDots.map((position) => (
                <span key={position} className={`absolute h-2 w-2 rounded-full bg-accent-green shadow-[0_0_18px_rgba(34,197,94,0.45)] ${position}`} />
              ))}
              {amberDots.map((position) => (
                <span key={position} className={`absolute h-2 w-2 rounded-full bg-accent-amber shadow-[0_0_18px_rgba(245,158,11,0.45)] ${position}`} />
              ))}
              {redDots.map((position) => (
                <span key={position} className={`absolute h-2 w-2 rounded-full bg-accent-red shadow-[0_0_18px_rgba(239,68,68,0.45)] ${position}`} />
              ))}
              <div className="absolute bottom-3 right-3 flex gap-4 rounded-lg bg-agri-surface/80 px-3 py-2 backdrop-blur-sm">
                {[
                  ["bg-accent-green", "Compliant"],
                  ["bg-accent-amber", "Review"],
                  ["bg-accent-red", "Alert"],
                ].map(([dot, label]) => (
                  <span key={label} className="flex items-center gap-2 text-xs text-agri-muted">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </GradientCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GradientCard>
          <div className="p-5">
            <h3 className="mb-4 text-base font-semibold text-agri-text">Recent compliance alerts</h3>
            {[
              ["bg-accent-red", "Batch AGT-1103 flagged: GMO disclosure missing", "GreenFields Farms, Kaduna"],
              ["bg-accent-amber", "Farm ID #0892 inspection overdue", "Sunrise Agro Ltd., Oyo State"],
              ["bg-accent-red", "Batch AGT-0987 failed residue test (Chlorpyrifos)", "Ife Agri Cooperative, Edo"],
              ["bg-accent-amber", "Incomplete documentation for Batch AGT-1044", "Niger Delta Rice Farms, Rivers"],
            ].map(([dot, alert, meta]) => (
              <div key={alert} className="flex items-start gap-3 border-b border-agri-border py-3 last:border-0">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                <div>
                  <p className="text-sm font-medium text-agri-text">{alert}</p>
                  <p className="text-xs text-agri-muted">{meta}</p>
                </div>
                <Link className="ml-auto shrink-0 text-xs text-accent-blue" href="/dashboard/compliance">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </GradientCard>

        <GradientCard>
          <div className="p-5">
            <h3 className="mb-4 text-base font-semibold text-agri-text">Top performing regions</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={regionData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="#2a2a3e" />
                  <XAxis
                    domain={[90, 100]}
                    tickFormatter={(value) => `${value}%`}
                    type="number"
                    tick={{ fill: "#6b6b80", fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="state"
                    type="category"
                    width={90}
                    tick={{ fill: "#b0b0c0", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#12121a",
                      border: "1px solid #2a2a3e",
                      borderRadius: "8px",
                      color: "#f0f0f5",
                    }}
                    formatter={(value) => `${value}%`}
                  />
                  <Bar dataKey="compliance" fill="#22C55E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GradientCard>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();

      if (error || !userData) {
        // No profile row yet — send them to finish onboarding.
        router.push("/onboarding");
        return;
      }

      setRole(userData.role as UserRole);
      setIsLoading(false);
    }

    loadRole();
  }, [router]);

  if (isLoading || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-agri-base">
        <p className="text-agri-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (role === "REGULATOR") {
    return <RegulatorDashboard />;
  }

  return <FarmerDashboard />;
}

