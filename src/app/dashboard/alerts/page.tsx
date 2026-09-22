"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Info, Loader2, BellOff } from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  fetchRealAlerts,
  markAlertsAsViewed,
  type RealAlert,
} from "@/lib/alerts";
import type { UserRole } from "@/types";

const filters = ["All", "Critical", "Warnings", "Info"] as const;
type FilterType = (typeof filters)[number];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAndMarkAlerts() {
      setIsLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        let userRole: UserRole | undefined = undefined;

        if (userData.user) {
          const { data: userProfile } = await supabase
            .from("users")
            .select("role")
            .eq("id", userData.user.id)
            .single();

          if (userProfile) {
            userRole = userProfile.role as UserRole;
          }

          await markAlertsAsViewed(userData.user.id);
        }

        const realAlerts = await fetchRealAlerts(userRole, userData.user?.id);
        setAlerts(realAlerts);
      } catch (err) {
        console.error("Error loading alerts:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAndMarkAlerts();
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Critical") return alert.type === "critical";
    if (activeFilter === "Warnings") return alert.type === "warning";
    if (activeFilter === "Info") return alert.type === "info";
    return true;
  });

  return (
    <div className="pb-10">
      <header className="mb-6 px-8 pt-8">
        <h1
          className="text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Alerts
        </h1>
        <p className="mt-1 text-agri-muted">
          Stay on top of inspections, compliance flags, and supply chain events.
        </p>
      </header>

      <div className="mb-6 flex gap-2 px-8">
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-accent-blue text-white shadow-sm"
                  : "border border-agri-border bg-agri-surface text-agri-muted hover:bg-agri-raised hover:text-agri-text"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="mx-8 flex items-center justify-center rounded-xl border border-agri-border bg-agri-surface p-12 text-agri-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-accent-blue" />
          <span>Loading live alerts...</span>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="mx-8 rounded-xl border border-agri-border bg-agri-surface p-12 text-center">
          <BellOff className="mx-auto mb-3 h-10 w-10 text-agri-muted" />
          <p className="text-sm font-medium text-agri-text">No alerts found</p>
          <p className="mt-1 text-xs text-agri-muted">
            There are no {activeFilter !== "All" ? activeFilter.toLowerCase() : ""} alerts requiring your attention at this time.
          </p>
        </div>
      ) : (
        <div className="mx-8 flex flex-col gap-3">
          {filteredAlerts.map((alert) => {
            const iconStyles =
              alert.type === "critical"
                ? "bg-accent-red/20 text-accent-red"
                : alert.type === "warning"
                  ? "bg-accent-amber/20 text-accent-amber"
                  : "bg-accent-blue/20 text-accent-blue";

            const Icon =
              alert.type === "critical"
                ? AlertTriangle
                : alert.type === "warning"
                  ? Clock
                  : Info;

            return (
              <div
                key={alert.id}
                className="flex items-start gap-4 rounded-xl border border-agri-border bg-agri-surface p-4 transition-all hover:border-agri-border-focus"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconStyles}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-agri-text">
                    {alert.title}
                  </p>
                  <p className="mt-1 text-xs text-agri-muted">
                    {alert.description}
                  </p>
                  <p className="mt-1 text-xs text-agri-muted">{alert.time}</p>
                </div>
                <Link
                  href={alert.href}
                  className="shrink-0 text-xs font-medium text-accent-blue hover:underline"
                >
                  Review →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
