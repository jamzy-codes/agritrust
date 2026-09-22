import type { UserRole } from "@/types";

export const DASHBOARD_ROUTE_ACCESS: Record<string, UserRole[]> = {
  "/dashboard": ["FARMER", "INSPECTOR", "DISTRIBUTOR", "REGULATOR"],
  "/dashboard/approvals": ["REGULATOR"],
  "/dashboard/batches": ["FARMER", "INSPECTOR", "DISTRIBUTOR", "REGULATOR"],
  "/dashboard/farms": ["FARMER", "INSPECTOR", "REGULATOR"],
  "/dashboard/trace": ["FARMER", "INSPECTOR", "DISTRIBUTOR", "REGULATOR"],
  "/dashboard/register": ["FARMER", "INSPECTOR", "DISTRIBUTOR"],
  "/dashboard/compliance": ["FARMER", "INSPECTOR", "REGULATOR"],
  "/dashboard/analytics": ["FARMER", "REGULATOR"],
  "/dashboard/alerts": ["FARMER", "INSPECTOR", "DISTRIBUTOR", "REGULATOR"],
  "/dashboard/reports": ["FARMER", "INSPECTOR", "DISTRIBUTOR", "REGULATOR"],
  "/dashboard/audit-trail": ["REGULATOR"],
  "/dashboard/smart-contracts": ["REGULATOR"],
  "/dashboard/integrations": ["REGULATOR"],
  "/dashboard/settings": ["FARMER", "INSPECTOR", "DISTRIBUTOR", "REGULATOR"],
};

export function canAccessRoute(pathname: string | null | undefined, role?: UserRole | null): boolean {
  if (!pathname || !role) {
    return false;
  }

  const matchingRoute = Object.entries(DASHBOARD_ROUTE_ACCESS).find(([route]) => {
    if (route === "/dashboard") {
      return pathname === route || pathname.startsWith("/dashboard/");
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  });

  if (!matchingRoute) {
    return pathname === "/dashboard" ? true : false;
  }

  return matchingRoute[1].includes(role);
}
