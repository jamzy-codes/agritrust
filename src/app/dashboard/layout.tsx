"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Clock, LogOut } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { canAccessRoute } from "@/lib/route-access";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

interface CurrentUser {
  userName: string;
  email: string;
  role: UserRole;
  initials: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.push("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("users")
        .select("full_name, email, role, status")
        .eq("id", userData.user.id)
        .single();

      if (error || !profile) {
        router.push("/onboarding");
        return;
      }

      if (profile.status === "rejected") {
        router.push("/onboarding");
        return;
      }

      if (profile.status === "pending") {
        setIsPending(true);
        setIsLoading(false);
        return;
      }

      const name = profile.full_name || profile.email || "User";

      const userRole = profile.role as UserRole;

      setCurrentUser({
        userName: name,
        email: profile.email ?? "",
        role: userRole,
        initials: getInitials(name),
      });
      setIsLoading(false);
    }

    loadUser();
  }, [router]);

  useEffect(() => {
    if (!isLoading && currentUser && !canAccessRoute(pathname, currentUser.role)) {
      router.push("/dashboard");
    }
  }, [currentUser, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-agri-base">
        <p className="text-agri-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-agri-base p-4">
        <div className="fixed inset-0 -z-10 bg-agri-base">
          <div className="absolute top-0 left-0 right-0 h-96 hero-gradient opacity-60 pointer-events-none" />
        </div>
        <div className="glass relative z-10 flex w-full max-w-lg flex-col items-center rounded-2xl border border-agri-border bg-agri-surface p-8 text-center shadow-[0_32px_64px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-amber/20 text-accent-amber glow-amber mb-2">
            <Clock className="h-8 w-8 text-accent-amber" />
          </div>

          <h1
            className="mt-4 text-2xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Your application is under review
          </h1>

          <p className="mt-3 text-sm text-agri-muted leading-relaxed max-w-md">
            A Regulator is reviewing your credentials. You&apos;ll get full access once approved.
          </p>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-agri-raised hover:bg-agri-raised/80 px-4 py-2.5 text-sm font-medium text-agri-text border border-agri-border transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-agri-muted" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-agri-base">
      <div className="fixed inset-0 -z-10 bg-agri-base">
        <div className="absolute top-0 left-65px right-0 h-125px hero-gradient opacity-60 pointer-events-none" />
      </div>
      <Sidebar role={currentUser?.role} isMobileOpen={isMobileOpen} />
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close mobile navigation"
          className="fixed bottom-0 left-0 right-0 top-16 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className="min-h-screen lg:ml-14">
        <TopBar
          onMenuClick={() => setIsMobileOpen((current) => !current)}
          userName={currentUser?.userName}
          email={currentUser?.email}
          role={currentUser?.role}
          initials={currentUser?.initials}
        />
        <main className="min-h-screen pt-16">{children}</main>
      </div>
    </div>
  );
}
