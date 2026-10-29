"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Info, Loader2, BellOff } from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  fetchRealAlerts,
  logAlertsError,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let isFetching = false;

    async function loadAlerts(markViewed = false) {
      if (isFetching) return;
      isFetching = true;

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw userError ?? new Error("You must be signed in to view alerts.");
        }

        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", userData.user.id)
          .single();
        if (profileError || !userProfile) {
          throw profileError ?? new Error("Your alert permissions could not be resolved.");
        }

        const realAlerts = await fetchRealAlerts(
          userProfile.role as UserRole,
          userData.user.id,
        );
        const readStateResult = markViewed
          ? await markAlertsAsViewed(userData.user.id)
          : null;

        if (isActive) {
          setAlerts(realAlerts);
          setErrorMessage(
            readStateResult && !readStateResult.databasePersisted
              ? "Notifications loaded, but read state is temporarily saved on this device only."
              : null,
          );
        }
      } catch (error) {
        logAlertsError("Error loading alerts in AlertsPage", error);
        if (isActive) {
          setErrorMessage(
            "Alerts could not be refreshed. Previously loaded alerts are shown when available.",
          );
        }
      } finally {
        isFetching = false;
        if (isActive) setIsLoading(false);
      }
    }

    loadAlerts(true);
    const interval = window.setInterval(() => loadAlerts(false), 30000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
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
      <header className="mb-6 px-4 pt-6 sm:px-8 sm:pt-8">
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

      <div className="mb-6 flex flex-wrap gap-2 px-4 sm:px-8">
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

      {errorMessage && (
        <div
          className="mx-4 mb-4 rounded-xl border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red sm:mx-8"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="mx-4 flex items-center justify-center sm:mx-8 rounded-xl border border-agri-border bg-agri-surface p-12 text-agri-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-accent-blue" />
          <span>Loading live alerts...</span>
        </div>
      ) : filteredAlerts.length === 0 && !errorMessage ? (
        <div className="mx-4 rounded-xl border border-agri-border bg-agri-surface p-8 text-center sm:mx-8 sm:p-12">
          <BellOff className="mx-auto mb-3 h-10 w-10 text-agri-muted" />
          <p className="text-sm font-medium text-agri-text">No alerts found</p>
          <p className="mt-1 text-xs text-agri-muted">
            There are no {activeFilter !== "All" ? activeFilter.toLowerCase() : ""} pending or historical notifications available.
          </p>
        </div>
      ) : filteredAlerts.length > 0 ? (
        <div className="mx-4 flex flex-col gap-3 sm:mx-8">
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
                className="flex flex-wrap items-start gap-3 rounded-xl border border-agri-border bg-agri-surface p-4 transition-all hover:border-agri-border-focus sm:flex-nowrap sm:gap-4"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconStyles}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
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
                  className="ml-13 shrink-0 text-xs font-medium text-accent-blue hover:underline sm:ml-0"
                >
                  Review &rarr;
                </Link>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
