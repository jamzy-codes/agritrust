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
  getLastViewedAlertsAt,
  markAlertsAsViewed,
  type RealAlert,
} from "@/lib/alerts";
import type { UserRole } from "@/types";

interface TopBarProps {
  searchPlaceholder?: string;
  userName?: string;
  email?: string;
  role?: UserRole;
  initials?: string;
  onMenuClick?: () => void;
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
  searchPlaceholder = "Search AgriTrust...",
  userName = "User",
  email = "innovaro@gmail.com",
  role = "FARMER",
  initials = "U",
  onMenuClick,
}: TopBarProps) {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);

  const styles = roleStyles[role];
  const router = useRouter();

  useEffect(() => {
    async function loadAlerts() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id || null;
      setUserId(currentUserId);

      const realAlerts = await fetchRealAlerts(role, currentUserId || undefined);
      setAlerts(realAlerts);

      if (currentUserId) {
        const lastViewedAt = await getLastViewedAlertsAt(currentUserId);
        if (!lastViewedAt) {
          setUnreadCount(realAlerts.length);
        } else {
          const unread = realAlerts.filter(
            (a) => new Date(a.rawTime).getTime() > new Date(lastViewedAt).getTime(),
          ).length;
          setUnreadCount(unread);
        }
      } else {
        setUnreadCount(realAlerts.length);
      }
    }

    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const handleToggleAlerts = async () => {
    setIsProfileOpen(false);
    const nextState = !isAlertsOpen;
    setIsAlertsOpen(nextState);

    if (nextState && userId) {
      setUnreadCount(0);
      await markAlertsAsViewed(userId);
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

      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-4 border-b border-agri-border border-white/5 bg-agri-surface/85 px-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-agri-muted hover:bg-agri-raised hover:text-agri-text lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <BrandLogo className="lg:-ml-4" size="md" />

        <div className="mx-auto max-w-md flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
            <input
              className="w-full rounded-lg border border-agri-border bg-agri-raised py-2 pl-9 pr-14 text-sm text-agri-text placeholder:text-agri-muted transition-colors focus:border-agri-border-focus focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
              placeholder={searchPlaceholder}
              type="search"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-agri-border bg-agri-overlay px-1.5 py-0.5 font-mono text-[10px] text-agri-muted">
              ⌘K
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              className="relative cursor-pointer p-1"
              onClick={handleToggleAlerts}
              aria-label="Alerts"
            >
              <Bell className="h-5 w-5 text-agri-muted hover:text-agri-text" />
              {unreadCount > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isAlertsOpen && (
              <div
                className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-agri-border bg-agri-surface shadow-xl"
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

                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-agri-muted">
                    No active alerts at this time.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
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
                    if (userId) await markAlertsAsViewed(userId);
                  }}
                >
                  View all alerts →
                </Link>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              className="ml-1 flex cursor-pointer items-center gap-2.5 border-l border-agri-border pl-3 transition-opacity hover:opacity-80"
              onClick={() => {
                setIsAlertsOpen(false);
                setIsProfileOpen((current) => !current);
              }}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${styles.avatar}`}
              >
                {initials}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium leading-tight text-agri-text">
                  {userName}
                </p>
                <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-agri-muted">
                  {role}
                </p>
              </div>
              <ChevronDown
                className={`ml-1 h-3.5 w-3.5 shrink-0 text-agri-muted transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {isProfileOpen && (
              <div
                className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-xl border border-agri-border bg-agri-surface shadow-xl"
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
