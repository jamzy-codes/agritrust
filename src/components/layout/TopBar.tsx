"use client";

import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BrandLogo from "@/components/brand/BrandLogo";
import { supabase } from "@/lib/supabase";
import {
  fetchRealAlerts,
  getAlertsReadState,
  logAlertsError,
  markAlertsAsViewed,
  type RealAlert,
} from "@/lib/alerts";
import type { UserRole } from "@/types";

interface TopBarProps {
  authenticatedUserId?: string;
  searchPlaceholder?: string;
  userName?: string;
  email?: string;
  role?: UserRole;
  initials?: string;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
}

const roleStyles: Record<UserRole, { avatar: string }> = {
  FARMER: {
    avatar: "bg-accent-green/20 text-accent-green",
  },
  INSPECTOR: {
    avatar: "bg-accent-blue/20 text-accent-blue",
  },
  DISTRIBUTOR: {
    avatar: "bg-accent-amber/20 text-accent-amber",
  },
  REGULATOR: {
    avatar: "bg-accent-purple/20 text-accent-purple",
  },
  CONSUMER: {
    avatar: "bg-accent-cyan/20 text-accent-cyan",
  },
};

export default function TopBar({
  authenticatedUserId,
  searchPlaceholder = "Search AgriTrust...",
  userName = "User",
  email = "innovaro@gmail.com",
  role = "FARMER",
  initials = "U",
  onMenuClick,
  isMenuOpen = false,
}: TopBarProps) {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const styles = roleStyles[role];
  const router = useRouter();

  useEffect(() => {
    let isActive = true;
    let isFetching = false;

    async function loadAlerts() {
      if (isFetching) return;
      isFetching = true;

      try {
        const currentUserId = authenticatedUserId ?? null;
        if (!currentUserId) {
          if (!isActive) return;
          setAlerts([]);
          setUnreadCount(0);
          setAlertsError(null);
          return;
        }
        const realAlerts = await fetchRealAlerts(role, currentUserId || undefined);
        if (!isActive) return;
        setAlerts(realAlerts);
        setAlertsError(null);

        if (currentUserId) {
          const readState = await getAlertsReadState(currentUserId);
          if (!isActive) return;

          const unread = readState.lastViewedAt
            ? realAlerts.filter(
                (alert) => new Date(alert.rawTime).getTime() > new Date(readState.lastViewedAt!).getTime(),
              ).length
            : realAlerts.length;
          setUnreadCount(unread);
          if (!readState.databaseAuthoritative) {
            setAlertsError("Read state is temporarily saved on this device only.");
          }
        } else {
          setUnreadCount(realAlerts.length);
        }
      } catch (error) {
        logAlertsError("Error loading notification alerts in TopBar", error);
        if (isActive) setAlertsError("Alerts could not be refreshed.");
      } finally {
        isFetching = false;
      }
    }

    loadAlerts();
    const interval = window.setInterval(loadAlerts, 30000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [authenticatedUserId, role]);

  useEffect(() => {
    if (!isAlertsOpen && !isProfileOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAlertsOpen(false);
        setIsProfileOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isAlertsOpen, isProfileOpen]);

  const handleToggleAlerts = async () => {
    setIsProfileOpen(false);
    const nextState = !isAlertsOpen;
    setIsAlertsOpen(nextState);

    if (nextState && authenticatedUserId) {
      setUnreadCount(0);
      const result = await markAlertsAsViewed(authenticatedUserId);
      if (!result.databasePersisted) {
        setAlertsError("Read state is temporarily saved on this device only.");
      }
    }
  };

  async function handleLogout() {
    setIsProfileOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {(isAlertsOpen || isProfileOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setIsAlertsOpen(false);
            setIsProfileOpen(false);
          }}
          role="presentation"
        />
      )}

      <header className="fixed inset-x-0 top-0 z-30 flex h-28 flex-wrap items-center gap-x-2 gap-y-2 border-b border-white/5 bg-agri-surface/90 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-4 lg:h-16 lg:flex-nowrap lg:gap-4 lg:px-6 lg:py-0">
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-agri-muted hover:bg-agri-raised hover:text-agri-text lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
          aria-controls="dashboard-navigation"
          aria-expanded={isMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>

        <BrandLogo className="shrink-0 lg:-ml-4" size="sm" />

        <form
          className="order-3 w-full flex-none lg:order-none lg:mx-auto lg:max-w-md lg:flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const query = searchQuery.trim();
            if (!query) return;
            window.sessionStorage.setItem("agritrust_dashboard_search", query);
            router.push("/dashboard/trace");
          }}
          role="search"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
            <input
              className="w-full rounded-lg border border-agri-border bg-agri-raised py-2 pl-9 pr-4 text-sm text-agri-text placeholder:text-agri-muted transition-colors focus:border-agri-border-focus focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
              placeholder={searchPlaceholder}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search batches, farms, or custodians"
            />
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">
          <div className="relative">
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-agri-muted transition-colors hover:bg-agri-raised hover:text-agri-text"
              onClick={handleToggleAlerts}
              aria-label="Alerts"
              aria-expanded={isAlertsOpen}
              aria-haspopup="dialog"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4px items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isAlertsOpen && (
              <div
                className="fixed left-3 right-3 top-28 z-50 max-h-[calc(100dvh-7.75rem)] overflow-hidden rounded-xl border border-agri-border bg-agri-surface shadow-xl sm:left-auto sm:right-4 sm:w-80 lg:absolute lg:right-0 lg:top-12 lg:max-h-[calc(100dvh-5rem)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-agri-border px-4 py-3">
                  <p className="text-sm font-semibold text-agri-text">
                    Recent Alerts
                  </p>
                  <span className="text-xs text-agri-muted">
                    {unreadCount > 0 ? `${unreadCount} new` : `${alerts.length} total`}
                  </span>
                </div>

                {alertsError ? (
                  <div className="p-6 text-center text-xs text-accent-red">{alertsError}</div>
                ) : alerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-agri-muted">
                    No notifications are available at this time.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto overscroll-contain">
                    {alerts.slice(0, 3).map((alert) => {
                      const dotColor =
                        alert.type === "critical"
                          ? "bg-accent-red"
                          : alert.type === "warning"
                            ? "bg-accent-amber"
                            : "bg-accent-blue";

                      return (
                        <Link
                          key={alert.id}
                          href={alert.href}
                          onClick={() => setIsAlertsOpen(false)}
                          className="block cursor-pointer border-b border-agri-border/50 px-4 py-3 hover:bg-agri-raised last:border-b-0"
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium leading-snug text-agri-text">
                                {alert.title}
                              </p>
                              <p className="mt-0.5 text-xs text-agri-muted">
                                {alert.description}
                              </p>
                              <p className="mt-0.5 text-[10px] text-agri-muted/80">
                                {alert.time}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                <Link
                  href="/dashboard/alerts"
                  className="block border-t border-agri-border px-4 py-3 text-center text-sm font-medium text-accent-blue hover:bg-agri-raised"
                  onClick={async () => {
                    setIsAlertsOpen(false);
                    if (authenticatedUserId) {
                      const result = await markAlertsAsViewed(authenticatedUserId);
                      if (!result.databasePersisted) {
                        setAlertsError("Read state is temporarily saved on this device only.");
                      }
                    }
                  }}
                >
                  View all alerts &rarr;
                </Link>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg transition-colors hover:bg-agri-raised sm:border-l sm:border-agri-border sm:pl-3 lg:gap-2.5"
              onClick={() => {
                setIsAlertsOpen(false);
                setIsProfileOpen((current) => !current);
              }}
              aria-label="Open profile menu"
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${styles.avatar}`}
              >
                {initials}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium leading-tight text-agri-text">
                  {userName}
                </p>
                <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-agri-muted">
                  {role}
                </p>
              </div>
              <ChevronDown
                className={`ml-1 hidden h-3.5 w-3.5 shrink-0 text-agri-muted sm:block transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {isProfileOpen && (
              <div
                className="fixed left-3 right-3 top-28 z-50 max-h-[calc(100dvh-7.75rem)] overflow-y-auto overscroll-contain rounded-xl border border-agri-border bg-agri-surface shadow-xl sm:left-auto sm:right-4 sm:w-56 lg:absolute lg:right-0 lg:top-14 lg:max-h-[calc(100dvh-5rem)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-agri-border px-4 py-3">
                  <p className="text-sm font-semibold text-agri-text">
                    {userName}
                  </p>
                  <p className="mt-0.5 text-xs text-agri-muted">
                    {email}
                  </p>
                </div>

                <Link
                  href="/dashboard/settings"
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-agri-muted transition-colors hover:bg-agri-raised hover:text-agri-text"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User className="h-4 w-4" />
                  My Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-agri-muted transition-colors hover:bg-agri-raised hover:text-agri-text"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Link>
                <Link
                  href="/help"
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-agri-muted transition-colors hover:bg-agri-raised hover:text-agri-text"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <HelpCircle className="h-4 w-4" />
                  Help & Support
                </Link>

                <div className="mx-3 my-1 h-px bg-agri-border" />

                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-accent-red transition-colors hover:bg-accent-red/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
