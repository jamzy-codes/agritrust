"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

interface CurrentUser {
  userName: string,
  email: string,
  role: UserRole,
  initials: string
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/login");
        return;
      }


      const { data: profile, error } = await supabase
        .from("users")
        .select("full_name, email, role")
        .eq("id", sessionData.session.user.id)
        .single();

      if (error || !profile) {
        router.push("/onboarding");
        return;
      }

      const name = profile.full_name || profile.email || "User";

      setCurrentUser({
        userName: name,
        email: profile.email ?? "",
        role: profile.role as UserRole,
        initials: getInitials(name)
      });
    }

    loadUser();
  }, [router]);
  return (
    <div className="relative min-h-screen bg-agri-base">
      <div className="fixed inset-0 -z-10 bg-agri-base">
        <div className="absolute top-0 left-[260px] right-0 h-125px hero-gradient opacity-60 pointer-events-none" />
      </div>
      <Sidebar isMobileOpen={isMobileOpen} />
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close mobile navigation"
          className="fixed bottom-0 left-0 right-0 top-16 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className="min-h-screen lg:ml-14">
        <TopBar onMenuClick={() => setIsMobileOpen((current) => !current)}
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
// useEffect and useRouter are imported from react and next/navigation respectively

