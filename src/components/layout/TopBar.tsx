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
import { useState } from "react";
import { useRouter } from "next/navigation";


import BrandLogo from "@/components/brand/BrandLogo";
import { supabase } from "@/lib/supabase";
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
  const styles = roleStyles[role];
  const router = useRouter();   
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
              className="cursor-pointer"
              onClick={() => {
                setIsProfileOpen(false);
                setIsAlertsOpen((current) => !current);
              }}
            >
              <Bell className="h-5 w-5 text-agri-muted hover:text-agri-text" />
            </button>
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent-amber" />

            {isAlertsOpen && (
              <div
                className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-agri-border bg-agri-surface shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-agri-border px-4 py-3">
                  <p className="text-sm font-semibold text-agri-text">
                    Recent Alerts
                  </p>
                  <span className="text-xs text-agri-muted">3 new</span>
                </div>

                <div className="cursor-pointer px-4 py-3 hover:bg-agri-raised">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-red" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-agri-text">
                        Batch AGT-1103 flagged: GMO disclosure missing
                      </p>
                      <p className="mt-0.5 text-xs text-agri-muted">
                        2 hours ago
                      </p>
                    </div>
                  </div>
                </div>

                <div className="cursor-pointer border-t border-agri-border px-4 py-3 hover:bg-agri-raised">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-amber" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-agri-text">
                        Farm ID #0892 inspection overdue
                      </p>
                      <p className="mt-0.5 text-xs text-agri-muted">
                        5 hours ago
                      </p>
                    </div>
                  </div>
                </div>

                <div className="cursor-pointer border-t border-agri-border px-4 py-3 hover:bg-agri-raised">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-amber" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-agri-text">
                        AGT-0041 awaiting inspection
                      </p>
                      <p className="mt-0.5 text-xs text-agri-muted">
                        1 day ago
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/dashboard/alerts"
                  className="block border-t border-agri-border px-4 py-3 text-center text-sm font-medium text-accent-blue hover:bg-agri-raised"
                  onClick={() => setIsAlertsOpen(false)}
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
