"use client";

import {
  BarChart3,
  Bell,
  ClipboardPlus,
  Code2,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Plug,
  Route,
  Settings,
  ShieldCheck,
  Sprout,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { DASHBOARD_ROUTE_ACCESS } from "@/lib/route-access";
import type { UserRole } from "@/types";

interface SidebarProps {
  role?: UserRole;
  isMobileOpen?: boolean;
}

const roleStyles: Record<
  UserRole,
  { active: string; activeBg: string; glow: string }
> = {
  FARMER: {
    active: "text-accent-green border-accent-green",
    activeBg: "bg-accent-green/10",
    glow: "glow-green",
  },
  INSPECTOR: {
    active: "text-accent-blue border-accent-blue",
    activeBg: "bg-accent-blue/10",
    glow: "glow-blue",
  },
  DISTRIBUTOR: {
    active: "text-accent-amber border-accent-amber",
    activeBg: "bg-accent-amber/10",
    glow: "glow-amber",
  },
  REGULATOR: {
    active: "text-accent-purple border-accent-purple",
    activeBg: "bg-accent-purple/10",
    glow: "glow-purple",
  },
  CONSUMER: {
    active: "text-accent-cyan border-accent-cyan",
    activeBg: "bg-accent-cyan/10",
    glow: "glow-blue",
  },
};

const navItems: Array<{ icon: LucideIcon; label: string; route: string }> = [
  { icon: LayoutDashboard, label: "Dashboard", route: "/dashboard" },
  { icon: UserCheck, label: "Approvals", route: "/dashboard/approvals" },
  { icon: Package, label: "Batches", route: "/dashboard/batches" },
  { icon: Sprout, label: "Farms", route: "/dashboard/farms" },
  { icon: Route, label: "Trace", route: "/dashboard/trace" },
  { icon: ClipboardPlus, label: "Register", route: "/dashboard/register" },
  { icon: ShieldCheck, label: "Compliance", route: "/dashboard/compliance" },
  { icon: BarChart3, label: "Analytics", route: "/dashboard/analytics" },
  { icon: Bell, label: "Alerts", route: "/dashboard/alerts" },
  { icon: FileText, label: "Reports", route: "/dashboard/reports" },
  { icon: History, label: "Audit Trail", route: "/dashboard/audit-trail" },
  {
    icon: Code2,
    label: "Smart Contracts",
    route: "/dashboard/smart-contracts",
  },
  { icon: Plug, label: "Integrations", route: "/dashboard/integrations" },
  { icon: Settings, label: "Settings", route: "/dashboard/settings" },
];

const DEFAULT_ROLE: UserRole = "FARMER";

export default function Sidebar({
  role = DEFAULT_ROLE,
  isMobileOpen = false,
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();
  const resolvedRole = role ?? DEFAULT_ROLE;
  const styles = roleStyles[resolvedRole];
  const isExpanded = isMobileOpen || isHovered;
  const visibleNavItems = navItems.filter(({ route }) =>
    DASHBOARD_ROUTE_ACCESS[route].includes(resolvedRole),
  );

  return (
    <aside
      className={`fixed bottom-0 left-0 top-16 z-50 flex flex-col overflow-y-auto border-r border-white/5 border-white/5 bg-agri-surface transition-[width,transform] duration-300 ease-out ${isExpanded ? "w-65px" : "w-14"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <nav className="flex-1 px-2 py-4">
        <p
          className={`text-[10px] font-bold uppercase tracking-widest text-agri-muted transition-opacity duration-200 ${isExpanded
              ? "mb-2 px-3 opacity-100"
              : "h-0 overflow-hidden opacity-0"
            }`}
        >
          MAIN
        </p>
        {visibleNavItems.map(({ icon: Icon, label, route }) => {
          const isActive =
            route === "/dashboard"
              ? pathname === route
              : pathname.startsWith(route);
          const stateClassName = isActive
            ? `border-l-[3px] pl-[9px] ${styles.active} ${styles.activeBg} ${styles.glow}`
            : "border-l-[3px] border-transparent text-agri-muted hover:bg-agri-raised hover:text-agri-text";
          const collapsedStateClassName = isActive
            ? `${styles.active} ${styles.activeBg} ${styles.glow}`
            : "text-agri-muted hover:bg-agri-raised hover:text-agri-text";

          return (
            <Link
              key={route}
              href={route}
              aria-label={label}
              title={isExpanded ? undefined : label}
              className={`flex items-center rounded-lg text-sm transition-all duration-150 ${isExpanded
                  ? `gap-3 px-3 py-2.5 ${stateClassName}`
                  : `mx-auto h-9 w-9 justify-center ${collapsedStateClassName}`
                }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span
                className={`whitespace-nowrap transition-opacity duration-200 ${isExpanded ? "opacity-100" : "w-0 overflow-hidden opacity-0"
                  }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-agri-border p-2">
        <Link
          href="/login"
          className={`flex cursor-pointer items-center rounded-lg text-sm text-agri-muted hover:bg-accent-red/10 hover:text-accent-red hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] ${isExpanded
              ? "gap-3 px-3 py-2.5"
              : "mx-auto h-9 w-9 justify-center"
            }`}
          title={isExpanded ? undefined : "Logout"}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span
            className={`whitespace-nowrap transition-opacity duration-200 ${isExpanded ? "opacity-100" : "w-0 overflow-hidden opacity-0"
              }`}
          >
            Logout
          </span>
        </Link>
      </div>
    </aside>
  );
}
