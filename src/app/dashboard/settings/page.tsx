"use client";

import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Crosshair,
  Home,
  Loader2,
  MapPin,
  QrCode,
  Save,
  Settings2,
  Shield,
  User,
  Wallet,
  X,
  ExternalLink,
  Unlink,
} from "lucide-react";

import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

type SectionKey = "profile" | "verification" | "wallet" | "qr" | "danger";

interface UserProfileState {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  walletAddress: string | null;
  emailConfirmedAt: string | null;
}

interface CredentialState {
  licenseNumber: string;
  certifyingBody: string;
  status: string;
}

const availableCrops = [
  "Cocoa",
  "Cassava",
  "Yam",
  "Maize",
  "Cashew",
  "Palm Oil",
  "Ginger",
  "Sesame Seeds",
  "Hibiscus",
  "Groundnut",
];

function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-agri-border bg-agri-surface p-12 text-center">
      <Settings2 className="mx-auto mb-4 h-12 w-12 text-agri-muted" />
      <p className="text-agri-muted">{title} settings coming soon.</p>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [copied, setCopied] = useState(false);
  const [updatingWallet, setUpdatingWallet] = useState(false);

  // User state
  const [userProfile, setUserProfile] = useState<UserProfileState | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [credentials, setCredentials] = useState<CredentialState | null>(null);

  // Farm Profile fields (for FARMER)
  const [farmId, setFarmId] = useState<string | null>(null);
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [nascRegistration, setNascRegistration] = useState("");
  const [crops, setCrops] = useState<string[]>(["Cocoa", "Cassava"]);
  const [isCropDropdownOpen, setIsCropDropdownOpen] = useState(false);

  // Wagmi & RainbowKit wallet hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    async function loadUserData() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return;

      const userId = userData.user.id;
      const emailConfirmedAt = (userData.user as unknown as { confirmed_at?: string }).confirmed_at ||
        (userData.user as unknown as { email_confirmed_at?: string }).email_confirmed_at || null;

      // 1. Fetch the profile through the server API.
      const { user: profile } = await api.get<{
        user: {
          id: string;
          full_name: string | null;
          email: string | null;
          role: UserRole;
          wallet_address: string | null;
        };
      }>(`/api/users/${userId}`);

      if (profile) {
        const uRole = (profile.role as UserRole) || "FARMER";
        const name = profile.full_name || profile.email || "User";

        setUserProfile({
          id: profile.id,
          fullName: name,
          email: profile.email || "",
          role: uRole,
          walletAddress: profile.wallet_address || null,
          emailConfirmedAt,
        });
        setOwnerName(name);

        // 2. If Inspector or Distributor, fetch public.credentials
        if (uRole === "INSPECTOR" || uRole === "DISTRIBUTOR") {
          const { data: cred } = await supabase
            .from("credentials")
            .select("license_number, certifying_body, status")
            .eq("user_id", userId)
            .maybeSingle();

          if (cred) {
            setCredentials({
              licenseNumber: cred.license_number || "N/A",
              certifyingBody: cred.certifying_body || "N/A",
              status: cred.status || "approved",
            });
          }
        }

        // 3. If Farmer, fetch public.farms
        if (uRole === "FARMER") {
          const { farms } = await api.get<{
            farms: Array<{
              id: string;
              farm_name: string;
              location: string;
              gps_coordinates: string | null;
              nasc_registration: string | null;
              primary_crops: string[] | null;
            }>;
          }>(`/api/farms?ownerId=${encodeURIComponent(userId)}`);
          const farm = farms[0];

          if (farm) {
            setFarmId(farm.id);
            setFarmName(farm.farm_name || "");
            setFarmLocation(farm.location || "");
            setGpsCoordinates(farm.gps_coordinates || "");
            setNascRegistration(farm.nasc_registration || "");
            if (farm.primary_crops && Array.isArray(farm.primary_crops)) {
              setCrops(farm.primary_crops);
            }
          }
        }
      }
    }

    loadUserData();
  }, []);

  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const role = userProfile?.role || "FARMER";
  const fullName = userProfile?.fullName || "User";
  const initials = getInitials(fullName);

  // Dynamic Navigation Items based on Role (Notifications tab removed per Part A)
  const navItems = [
    {
      key: "profile" as SectionKey,
      icon: role === "FARMER" ? Home : User,
      label: role === "FARMER" ? "Farm Profile" : "Profile",
    },
    { key: "verification" as SectionKey, icon: Shield, label: "Verification" },
    { key: "wallet" as SectionKey, icon: Wallet, label: "Connected Wallet" },
    ...(role === "FARMER"
      ? [{ key: "qr" as SectionKey, icon: QrCode, label: "QR Codes" }]
      : []),
    { key: "danger" as SectionKey, icon: AlertTriangle, label: "Danger Zone" },
  ];

  const removeCrop = (crop: string) => {
    setCrops((current) => current.filter((item) => item !== crop));
  };

  const addCrop = (crop: string) => {
    setCrops((current) => (current.includes(crop) ? current : [...current, crop]));
    setIsCropDropdownOpen(false);
  };

  const saveProfileChanges = async () => {
    setSaveStatus("saving");
    try {
      if (userProfile && ownerName.trim()) {
        await api.patch(`/api/users/${userProfile.id}`, {
          fullName: ownerName.trim(),
        });

        setUserProfile((prev) => (prev ? { ...prev, fullName: ownerName.trim() } : prev));
      }

      if (role === "FARMER" && userProfile) {
        const payload = {
          ownerId: userProfile.id,
          farmName: farmName.trim() || "My Farm",
          location: farmLocation.trim() || "Rivers State, Nigeria",
          gpsCoordinates: gpsCoordinates.trim() || null,
          nascRegistration: nascRegistration.trim() || null,
          primaryCrops: crops,
        };

        if (farmId) {
          const response = await api.patch<{ farm: { id: string } }>(`/api/farms/${farmId}`, payload);
          setFarmId(response.farm.id);
        } else {
          const response = await api.post<{ farm: { id: string } }>("/api/farms", payload);
          setFarmId(response.farm.id);
        }
      }
    } catch (e) {
      console.error("Error saving profile settings:", e);
    }

    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleUpdateWalletToConnected = async () => {
    if (!address || !userProfile) return;
    setUpdatingWallet(true);
    try {
      await api.patch(`/api/users/${userProfile.id}`, {
        walletAddress: address,
      });
      setUserProfile((prev) => (prev ? { ...prev, walletAddress: address } : prev));
    } catch (e) {
      console.error("Error updating wallet address:", e);
    } finally {
      setUpdatingWallet(false);
    }
  };

  const copyWalletAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dbWallet = userProfile?.walletAddress;
  const isWalletMismatch = isConnected && address && dbWallet && address.toLowerCase() !== dbWallet.toLowerCase();
  const isNoWalletRegistered = !dbWallet && isConnected && !!address;

  return (
    <div className="pb-10">
      <header className="mb-6 px-8 pt-8">
        <div className="flex items-center gap-3">
          <h1
            className="text-3xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Settings
          </h1>
          <span className="rounded-full bg-agri-raised px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-blue border border-agri-border">
            {role}
          </span>
        </div>
        <p className="mt-1 text-agri-muted">
          Manage your account profile, wallet access, and verification preferences.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-[240px_1fr] gap-8 px-8">
        <aside className="sticky top-24 h-fit rounded-xl border border-agri-border bg-agri-surface p-2">
          <nav className="flex flex-col gap-1">
            {navItems.map(({ key, icon: Icon, label }) => {
              const isActive = activeSection === key;
              const isDanger = key === "danger";

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all cursor-pointer ${isActive
                    ? isDanger
                      ? "bg-accent-red/10 font-medium text-accent-red"
                      : "bg-accent-green/10 font-medium text-accent-green"
                    : "text-agri-muted hover:bg-agri-raised hover:text-agri-text"
                    }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isDanger ? "text-red-400" : ""}`}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div>
          {/* PROFILE SECTION (Role-Aware) */}
          {activeSection === "profile" && (
            <>
              <h2 className="mb-6 text-xl font-bold text-agri-text">
                {role === "FARMER" ? "Farm Profile" : "Profile Details"}
              </h2>

              <div className="rounded-xl border border-agri-border bg-agri-surface p-6">
                <div className="mb-6 flex items-center gap-4">
                  <div className="relative h-20 w-20">
                    <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-accent-blue bg-accent-blue/20 text-2xl font-bold text-accent-blue">
                      {initials}
                    </div>
                    <div className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-agri-border bg-agri-surface hover:bg-agri-raised">
                      <Camera className="h-3.5 w-3.5 text-agri-text" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-agri-text">
                      {fullName}
                    </p>
                    <p className="mt-0.5 text-xs text-agri-muted">
                      {userProfile?.email}
                    </p>
                    <span className="mt-1.5 inline-block rounded-md bg-accent-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-blue">
                      {role} Role
                    </span>
                  </div>
                </div>

                {/* FARMER Profile Fields */}
                {role === "FARMER" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Farm name
                      </label>
                      <input
                        className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text focus:border-agri-border-focus focus:outline-none"
                        placeholder="e.g. Okafor Family Farm"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Owner name
                      </label>
                      <input
                        className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text focus:border-agri-border-focus focus:outline-none"
                        placeholder="e.g. Amara Okafor"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Farm location
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 pr-12 text-sm text-agri-text focus:border-agri-border-focus focus:outline-none"
                          placeholder="e.g. Rivers State, Nigeria"
                          value={farmLocation}
                          onChange={(e) => setFarmLocation(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center border-l border-agri-border bg-agri-raised px-3 hover:bg-agri-overlay"
                        >
                          <MapPin className="h-4 w-4 text-agri-muted" />
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        GPS coordinates
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 pr-12 font-mono text-sm text-agri-text focus:border-agri-border-focus focus:outline-none"
                          placeholder="e.g. 4.8156° N, 7.0498° E"
                          value={gpsCoordinates}
                          onChange={(e) => setGpsCoordinates(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center border-l border-agri-border bg-agri-raised px-3 hover:bg-agri-overlay"
                        >
                          <Crosshair className="h-4 w-4 text-agri-muted" />
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Primary crops
                      </label>
                      <div className="relative">
                        <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-agri-border bg-agri-raised p-2.5">
                          {crops.map((crop) => (
                            <span
                              key={crop}
                              className="flex items-center gap-1 rounded-full bg-accent-green/20 px-2.5 py-1 text-xs text-accent-green"
                            >
                              {crop}
                              <button
                                type="button"
                                onClick={() => removeCrop(crop)}
                              >
                                <X className="h-3 w-3 cursor-pointer" />
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            className="ml-auto"
                            onClick={() =>
                              setIsCropDropdownOpen((current) => !current)
                            }
                            aria-label="Toggle crop options"
                          >
                            <ChevronDown className="h-4 w-4 cursor-pointer text-agri-muted" />
                          </button>
                        </div>
                        {isCropDropdownOpen ? (
                          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-agri-border bg-agri-surface">
                            {availableCrops.map((crop) => {
                              const isSelected = crops.includes(crop);

                              return (
                                <button
                                  key={crop}
                                  type="button"
                                  className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm text-agri-muted hover:bg-agri-raised hover:text-agri-text disabled:cursor-default"
                                  onClick={() => addCrop(crop)}
                                  disabled={isSelected}
                                >
                                  <span>{crop}</span>
                                  {isSelected ? (
                                    <Check className="h-3.5 w-3.5 text-accent-green" />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        NASC Registration
                      </label>
                      <input
                        className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text focus:border-agri-border-focus focus:outline-none"
                        placeholder="e.g. NASC-NG-04821"
                        value={nascRegistration}
                        onChange={(e) => setNascRegistration(e.target.value)}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Farm ID on-chain
                      </label>
                      <div className="flex items-center justify-between rounded-lg border border-agri-border bg-agri-base px-4 py-2.5">
                        <div>
                          <p className="text-xs text-agri-muted">
                            Farm ID on-chain
                          </p>
                          <p className="font-mono text-sm text-accent-cyan">
                            {farmId
                              ? `${farmId.slice(0, 6)}...${farmId.slice(-4)}`
                              : "0x4F3a...E29c"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyWalletAddress(farmId || "0x4F3a...E29c")}
                          aria-label="Copy Farm ID"
                        >
                          <Copy className="h-4 w-4 cursor-pointer text-agri-muted hover:text-agri-text" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* INSPECTOR & DISTRIBUTOR Profile Fields */}
                {(role === "INSPECTOR" || role === "DISTRIBUTOR") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Full Name
                      </label>
                      <input
                        className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text focus:border-agri-border-focus focus:outline-none"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Email Address
                      </label>
                      <input
                        className="w-full rounded-lg border border-agri-border bg-agri-base px-4 py-2.5 text-sm text-agri-muted cursor-not-allowed"
                        value={userProfile?.email || ""}
                        disabled
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        License Number (Verified Credential)
                      </label>
                      <div className="rounded-lg border border-agri-border bg-agri-base px-4 py-2.5 text-sm text-agri-text font-mono">
                        {credentials?.licenseNumber || "N/A"}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Certifying Body
                      </label>
                      <div className="rounded-lg border border-agri-border bg-agri-base px-4 py-2.5 text-sm text-agri-text">
                        {credentials?.certifyingBody || "N/A"}
                      </div>
                    </div>
                  </div>
                )}

                {/* REGULATOR Profile Fields */}
                {role === "REGULATOR" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Full Name
                      </label>
                      <input
                        className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text focus:border-agri-border-focus focus:outline-none"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-agri-muted">
                        Email Address
                      </label>
                      <input
                        className="w-full rounded-lg border border-agri-border bg-agri-base px-4 py-2.5 text-sm text-agri-muted cursor-not-allowed"
                        value={userProfile?.email || ""}
                        disabled
                      />
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors cursor-pointer ${saveStatus === "saved"
                      ? "bg-accent-green"
                      : saveStatus === "saving"
                        ? "bg-accent-blue/70"
                        : "bg-accent-blue hover:bg-accent-blue/90"
                      }`}
                    onClick={saveProfileChanges}
                    disabled={saveStatus !== "idle"}
                  >
                    {saveStatus === "saving" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saveStatus === "saved" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Embedded Wallet Section in Profile */}
              <div className="mt-8">
                <h3 className="mb-4 text-lg font-semibold text-agri-text">
                  Connected Wallet Overview
                </h3>
                <div className="rounded-xl border border-agri-border bg-agri-surface p-6">
                  {/* Mismatch Warning */}
                  {isWalletMismatch && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-accent-amber/40 bg-accent-amber/10 p-4 text-xs text-accent-amber">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold">Wallet Address Mismatch</p>
                        <p className="mt-0.5">
                          Your live wallet (<span className="font-mono">{address}</span>) differs from your registered account wallet (<span className="font-mono">{dbWallet}</span>).
                        </p>
                        <button
                          type="button"
                          onClick={handleUpdateWalletToConnected}
                          disabled={updatingWallet}
                          className="mt-2 rounded-lg bg-accent-amber px-3 py-1 font-semibold text-black hover:bg-accent-amber/90 cursor-pointer"
                        >
                          {updatingWallet ? "Updating..." : "Update Registered Wallet to Match"}
                        </button>
                      </div>
                    </div>
                  )}
                  {isNoWalletRegistered && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-accent-blue/40 bg-accent-blue/10 p-4 text-xs text-accent-blue">
                      <Wallet className="h-5 w-5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold">No Wallet Registered Yet</p>
                        <p className="mt-0.5">
                          Your browser is connected to <span className="font-mono">{address}</span>, but your profile has no wallet registered in Supabase.
                        </p>
                        <button
                          type="button"
                          onClick={handleUpdateWalletToConnected}
                          disabled={updatingWallet}
                          className="mt-2 rounded-lg bg-accent-blue px-3 py-1 font-semibold text-white hover:bg-accent-blue/90 cursor-pointer disabled:opacity-50"
                        >
                          {updatingWallet ? "Registering..." : "Register Connected Wallet"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-blue/20">
                      <Wallet className="h-5 w-5 text-accent-blue" />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono text-sm font-semibold text-agri-text">
                        {dbWallet ? `${dbWallet.slice(0, 6)}...${dbWallet.slice(-4)}` : "No wallet registered"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {isConnected ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />
                            <p className="text-xs text-accent-green">Live Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 rounded-full bg-accent-amber" />
                            <p className="text-xs text-agri-muted">Browser Disconnected</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <button
                          type="button"
                          onClick={() => disconnect()}
                          className="flex items-center gap-1.5 rounded-lg border border-agri-border bg-agri-raised px-3 py-1.5 text-xs text-agri-muted transition-colors hover:border-accent-red/40 hover:text-accent-red cursor-pointer"
                        >
                          <Unlink className="h-3.5 w-3.5" />
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openConnectModal?.()}
                          className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-blue/90 cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Connect Wallet
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VERIFICATION TAB (Part D) */}
          {activeSection === "verification" && (
            <div>
              <h2 className="mb-6 text-xl font-bold text-agri-text">
                Account Verification
              </h2>

              <div className="rounded-xl border border-agri-border bg-agri-surface p-6">
                <div className="mb-6 flex items-start gap-4 rounded-xl border border-accent-blue/30 bg-accent-blue/10 p-4 text-xs text-agri-text">
                  <Shield className="h-5 w-5 shrink-0 text-accent-blue" />
                  <div>
                    <p className="font-semibold text-accent-blue">Email Verification Status</p>
                    <p className="mt-1 text-agri-muted leading-relaxed">
                      Account identity is tied to your login credentials. Note: Real email confirmation for password resets or identity verification requires setting up an external SMTP provider (such as Resend, SendGrid, or AWS SES) in Supabase Auth settings.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs text-agri-muted">
                      Account Email Address
                    </label>
                    <div className="rounded-lg border border-agri-border bg-agri-base px-4 py-2.5 text-sm text-agri-text">
                      {userProfile?.email || "N/A"}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs text-agri-muted">
                      Verification Status
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-agri-border bg-agri-base px-4 py-2.5 text-sm">
                      {userProfile?.emailConfirmedAt ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-accent-green" />
                          <span className="font-medium text-accent-green">Verified</span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-accent-blue" />
                          <span className="text-agri-muted">Not Applicable (Bypassed)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONNECTED WALLET TAB (Part C) */}
          {activeSection === "wallet" && (
            <div>
              <h2 className="mb-6 text-xl font-bold text-agri-text">
                Connected Wallet Management
              </h2>

              <div className="rounded-xl border border-agri-border bg-agri-surface p-6">
                {isWalletMismatch && (
                  <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent-amber/40 bg-accent-amber/10 p-4 text-xs text-accent-amber">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold">Wallet Mismatch Detected</p>
                      <p className="mt-1 leading-relaxed">
                        Your browser wallet (<span className="font-mono">{address}</span>) differs from your registered account wallet (<span className="font-mono">{dbWallet}</span>).
                      </p>
                      <button
                        type="button"
                        onClick={handleUpdateWalletToConnected}
                        disabled={updatingWallet}
                        className="mt-3 rounded-lg bg-accent-amber px-4 py-2 font-semibold text-black hover:bg-accent-amber/90 cursor-pointer"
                      >
                        {updatingWallet ? "Updating database..." : "Update Registered Wallet"}
                      </button>
                    </div>
                  </div>
                )}
                {isNoWalletRegistered && (
                  <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent-blue/40 bg-accent-blue/10 p-4 text-xs text-accent-blue">
                    <Wallet className="h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold">No Wallet Registered Yet</p>
                      <p className="mt-1 leading-relaxed">
                        Your browser wallet (<span className="font-mono">{address}</span>) is connected, but your profile has no registered account wallet in Supabase yet.
                      </p>
                      <button
                        type="button"
                        onClick={handleUpdateWalletToConnected}
                        disabled={updatingWallet}
                        className="mt-3 rounded-lg bg-accent-blue px-4 py-2 font-semibold text-white hover:bg-accent-blue/90 cursor-pointer disabled:opacity-50"
                      >
                        {updatingWallet ? "Registering in database..." : "Register Connected Wallet"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between rounded-xl border border-agri-border bg-agri-raised p-4">
                    <div>
                      <p className="text-xs text-agri-muted">Registered Account Wallet (Supabase)</p>
                      <p className="mt-1 font-mono text-base font-semibold text-accent-cyan">
                        {dbWallet || "No wallet registered"}
                      </p>
                    </div>
                    {dbWallet ? (
                      <button
                        type="button"
                        onClick={() => copyWalletAddress(dbWallet)}
                        className="flex items-center gap-1.5 rounded-lg border border-agri-border bg-agri-surface px-3 py-1.5 text-xs text-agri-muted hover:text-agri-text cursor-pointer"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-accent-green" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    ) : isConnected && address ? (
                      <button
                        type="button"
                        onClick={handleUpdateWalletToConnected}
                        disabled={updatingWallet}
                        className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-blue/90 cursor-pointer disabled:opacity-50"
                      >
                        {updatingWallet ? "Registering..." : "Register Connected Wallet"}
                      </button>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-agri-border bg-agri-raised p-4">
                    <div>
                      <p className="text-xs text-agri-muted">Active Web3 Connection (Wagmi)</p>
                      <p className="mt-1 font-mono text-sm text-agri-text">
                        {isConnected ? address : "Not connected in browser"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-accent-green animate-pulse" : "bg-accent-amber"}`} />
                        <span className={`text-xs ${isConnected ? "text-accent-green font-medium" : "text-agri-muted"}`}>
                          {isConnected ? "Connected" : "Disconnected"}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isConnected ? (
                        <button
                          type="button"
                          onClick={() => disconnect()}
                          className="flex items-center gap-2 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-2 text-xs font-medium text-accent-red hover:bg-accent-red/20 transition-colors cursor-pointer"
                        >
                          <Unlink className="h-4 w-4" />
                          Disconnect Wallet
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openConnectModal?.()}
                          className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-xs font-medium text-white hover:bg-accent-blue/90 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Connect Wallet
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "qr" && role === "FARMER" && (
            <SectionPlaceholder title="QR Codes" />
          )}

          {activeSection === "danger" && (
            <SectionPlaceholder title="Danger Zone" />
          )}
        </div>
      </div>
    </div>
  );
}
