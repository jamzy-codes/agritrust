"use client";

import Link from "next/link";
import { Camera, Sprout } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

interface Farm {
  id: string;
  owner_id: string;
  farm_name: string;
  location: string;
  gps_coordinates?: string | null;
  nasc_registration?: string | null;
  primary_crops?: string[] | null;
  farm_photo_url?: string | null;
  created_at?: string;
}

export default function FarmsPage() {
  const [role, setRole] = useState<UserRole>("FARMER");
  const [farmerFarm, setFarmerFarm] = useState<Farm | null>(null);
  const [allFarms, setAllFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        setIsLoading(false);
        return;
      }

      const userId = userData.user.id;

      // Get user role
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError || !userProfile?.role) {
        setIsLoading(false);
        return;
      }

      const userRole = userProfile.role as UserRole;
      setRole(userRole);

      if (userRole === "REGULATOR" || userRole === "INSPECTOR") {
        const response = await api.get<{ farms: Farm[] }>("/api/farms");
        setAllFarms(response.farms || []);
      } else {
        const response = await api.get<{ farms: Farm[] }>(`/api/farms?ownerId=${userId}`);
        setFarmerFarm((response.farms && response.farms[0]) || null);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  const isRegulatorOrInspector =
    role === "REGULATOR" || role === "INSPECTOR";

  if (isLoading) {
    return (
      <div className="flex min-h-100px items-center justify-center p-8">
        <p className="text-sm text-agri-muted">Loading farm profile...</p>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <header className="mb-6 px-8 pt-8">
        <h1
          className="text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Farms
        </h1>
        <p className="mt-1 text-agri-muted">
          {isRegulatorOrInspector
            ? "All registered farms in the network"
            : "Your registered farm"}
        </p>
      </header>

      {isRegulatorOrInspector ? (
        allFarms.length > 0 ? (
          <div className="mx-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allFarms.map((farm) => (
              <div
                key={farm.id}
                className="rounded-xl border border-agri-border bg-agri-surface p-5"
              >
                <div className="relative mb-4 h-24 overflow-hidden rounded-xl border border-agri-border bg-linear-to-br from-accent-green/20 to-agri-raised">
                  <div className="flex h-full items-center justify-center">
                    <Sprout className="h-10 w-10 text-accent-green/40" />
                  </div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-green/20">
                    <Sprout className="h-5 w-5 text-accent-green" />
                  </div>
                  <span className="rounded-full bg-accent-green/20 px-2 py-0.5 text-xs font-bold text-accent-green">
                    REGISTERED
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-bold text-agri-text">
                  {farm.farm_name}
                </h2>
                <p className="mt-1 text-sm text-agri-muted">{farm.location}</p>
                {farm.nasc_registration ? (
                  <p className="mt-1 font-mono text-xs text-agri-muted">
                    NASC: {farm.nasc_registration}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-8 rounded-xl border border-agri-border bg-agri-surface p-8 text-center">
            <Sprout className="mx-auto mb-3 h-10 w-10 text-agri-muted" />
            <h2 className="text-lg font-bold text-agri-text">No Farms Registered</h2>
            <p className="mt-1 text-sm text-agri-muted">
              There are currently no registered farms in the network database.
            </p>
          </div>
        )
      ) : farmerFarm ? (
        <div className="mx-8 rounded-xl border border-agri-border bg-agri-surface p-6">
          <div className="relative mb-5 h-40 overflow-hidden rounded-xl border border-agri-border bg-linear-to-br from-accent-green/20 to-agri-raised">
            <div className="flex h-full items-center justify-center">
              <Sprout className="h-12 w-12 text-accent-green/40" />
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-agri-base/80 px-3 py-1.5 backdrop-blur-sm">
              <Camera className="h-3.5 w-3.5 text-agri-muted" />
              <p className="text-xs text-agri-muted">Add farm photo</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent-green/20">
              <Sprout className="h-8 w-8 text-accent-green" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-agri-text">
                {farmerFarm.farm_name}
              </h2>
              <p className="text-sm text-agri-muted">
                {farmerFarm.location}
                {farmerFarm.nasc_registration ? ` · ${farmerFarm.nasc_registration}` : ""}
              </p>
              {farmerFarm.gps_coordinates ? (
                <p className="mt-0.5 font-mono text-xs text-accent-cyan">
                  GPS: {farmerFarm.gps_coordinates}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <div className="rounded-lg border border-agri-border bg-agri-raised px-4 py-3">
              <p className="text-lg font-bold text-agri-text">Active</p>
              <p className="text-sm text-agri-muted">Farm status</p>
            </div>
            <div className="rounded-lg border border-agri-border bg-agri-raised px-4 py-3">
              <p className="text-lg font-bold text-accent-green">Verified</p>
              <p className="text-sm text-agri-muted">On-chain profile</p>
            </div>
          </div>

          {farmerFarm.primary_crops && farmerFarm.primary_crops.length > 0 ? (
            <div className="mt-6">
              <p className="mb-2 text-sm text-agri-muted">Primary crops</p>
              <div className="flex flex-wrap gap-2">
                {farmerFarm.primary_crops.map((crop) => (
                  <span
                    key={crop}
                    className="rounded-full bg-accent-green/20 px-3 py-1 text-xs text-accent-green"
                  >
                    {crop}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <Link
            href="/dashboard/settings"
            className="mt-6 block text-sm text-accent-blue"
          >
            Manage Farm Profile →
          </Link>
        </div>
      ) : (
        <div className="mx-8 rounded-xl border border-agri-border bg-agri-surface p-8 text-center">
          <Sprout className="mx-auto mb-3 h-10 w-10 text-agri-muted" />
          <h2 className="text-lg font-bold text-agri-text">No Farm Profile Found</h2>
          <p className="mt-1 text-sm text-agri-muted">
            You haven&apos;t completed your farm registration yet.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-4 inline-block rounded-lg bg-accent-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-green/90"
          >
            Set Up Farm Profile
          </Link>
        </div>
      )}
    </div>
  );
}
