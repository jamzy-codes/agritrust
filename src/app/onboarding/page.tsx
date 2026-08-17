"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  AlertTriangle,
  Check,
  Clock,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Sprout,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import BrandLogo, { BrandName } from "@/components/brand/BrandLogo";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

interface RoleCard {
  role: UserRole;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  glow: string;
  selectedGlow: string;
  title: string;
  description: string;
}

const roles: RoleCard[] = [
  {
    role: "FARMER",
    icon: Sprout,
    color: "text-accent-green",
    bg: "bg-accent-green/20",
    border: "border-accent-green",
    glow: "glow-green",
    selectedGlow: "shadow-[0_0_32px_rgba(34,197,94,0.3)]",
    title: "Farmer",
    description: "Register produce batches, log farming practices, and receive biosafety certificates.",
  },
  {
    role: "INSPECTOR",
    icon: ShieldCheck,
    color: "text-accent-blue",
    bg: "bg-accent-blue/20",
    border: "border-accent-blue",
    glow: "glow-blue",
    selectedGlow: "shadow-[0_0_32px_rgba(59,130,246,0.3)]",
    title: "Inspector",
    description: "Verify produce quality, record biosafety compliance, and issue certifications.",
  },
  {
    role: "DISTRIBUTOR",
    icon: Truck,
    color: "text-accent-amber",
    bg: "bg-accent-amber/20",
    border: "border-accent-amber",
    glow: "glow-amber",
    selectedGlow: "shadow-[0_0_32px_rgba(245,158,11,0.3)]",
    title: "Distributor",
    description: "Record handoffs between warehouses, transport legs, and market delivery.",
  },
];

const AVAILABLE_CROPS = [
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

type Stage = "role-select" | "farm-details" | "credential-submission" | "pending";

export default function OnboardingPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("role-select");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResubmission, setIsResubmission] = useState(false);

  const [licenseNumber, setLicenseNumber] = useState("");
  const [certifyingBody, setCertifyingBody] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [nascRegistration, setNascRegistration] = useState("");
  const [crops, setCrops] = useState<string[]>(["Cocoa", "Cassava"]);

  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    async function checkSessionAndProfile() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const userId = sessionData.session.user.id;

      const { data: userProfile } = await supabase
        .from("users")
        .select("role, status")
        .eq("id", userId)
        .maybeSingle();

      if (userProfile?.role) {
        const role = userProfile.role as UserRole;
        setSelectedRole(role);

        if (role === "INSPECTOR" || role === "DISTRIBUTOR") {
          const { data: existingCredential } = await supabase
            .from("credentials")
            .select("id, status, license_number, certifying_body")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingCredential) {
            if (existingCredential.license_number) {
              setLicenseNumber(existingCredential.license_number);
            }
            if (existingCredential.certifying_body) {
              setCertifyingBody(existingCredential.certifying_body);
            }

            if (userProfile.status === "rejected" || existingCredential.status === "rejected") {
              setIsResubmission(true);
              setStage("credential-submission");
            } else if (existingCredential.status === "pending" || userProfile.status === "pending") {
              setStage("pending");
            }
          }
        }
      }
    }
    checkSessionAndProfile();
  }, [router]);

  function toggleCrop(crop: string) {
    setCrops((current) =>
      current.includes(crop) ? current.filter((c) => c !== crop) : [...current, crop]
    );
  }

  async function handleRoleContinue() {
    if (!selectedRole) return;

    setError(null);

    if (selectedRole === "FARMER") {
      setStage("farm-details");
    } else if (selectedRole === "INSPECTOR" || selectedRole === "DISTRIBUTOR") {
      setStage("credential-submission");
    }
  }

  async function handleFarmDetailsSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedRole !== "FARMER") return;

    if (!isConnected || !address) {
      setError("Connect your wallet before completing farm setup.");
      return;
    }

    if (!farmName.trim() || !farmLocation.trim()) {
      setError("Please fill in all required farm detail fields.");
      return;
    }

    setError(null);
    setIsSaving(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("You must be signed in to continue.");
      setIsSaving(false);
      return;
    }

    const user = userData.user;

    const { error: upsertError } = await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? null,
      role: "FARMER",
      wallet_address: address,
      status: "active",
    });

    if (upsertError) {
      setError(upsertError.message);
      setIsSaving(false);
      return;
    }

    const { error: farmError } = await supabase.from("farms").insert({
      owner_id: user.id,
      farm_name: farmName.trim(),
      location: farmLocation.trim(),
      gps_coordinates: gpsCoordinates.trim() || null,
      nasc_registration: nascRegistration.trim() || null,
      primary_crops: crops,
    });

    setIsSaving(false);

    if (farmError) {
      setError(farmError.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleCredentialSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRole) return;

    if (!isConnected || !address) {
      setError(
        "Connect your wallet before submitting — the Regulator needs your wallet address to approve your account."
      );
      return;
    }

    if (!licenseNumber.trim() || !certifyingBody.trim()) {
      setError("Please fill in all required credential fields.");
      return;
    }

    setError(null);
    setIsSaving(true);

    const documentUrl: string | null = null;

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("You must be signed in to continue.");
      setIsSaving(false);
      return;
    }

    const user = userData.user;

    // Reset user status back to 'pending'
    const { error: upsertError } = await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? null,
      role: selectedRole,
      wallet_address: address,
      status: "pending",
    });

    if (upsertError) {
      setError(upsertError.message);
      setIsSaving(false);
      return;
    }

    // Check for existing credential row for user_id to prevent duplicates
    const { data: existingCredential } = await supabase
      .from("credentials")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingCredential) {
      // Update existing credential record
      const { error: updateError } = await supabase
        .from("credentials")
        .update({
          license_number: licenseNumber.trim(),
          certifying_body: certifyingBody.trim(),
          document_url: documentUrl,
          status: "pending",
          submitted_at: new Date().toISOString(),
          reviewed_by: null,
          reviewed_at: null,
        })
        .eq("id", existingCredential.id);

      setIsSaving(false);

      if (updateError) {
        setError(updateError.message);
        return;
      }
    } else {
      // Insert new credential record for first-time applicant
      const { error: credError } = await supabase.from("credentials").insert({
        user_id: user.id,
        license_number: licenseNumber.trim(),
        certifying_body: certifyingBody.trim(),
        document_url: documentUrl,
      });

      setIsSaving(false);

      if (credError) {
        setError(credError.message);
        return;
      }
    }

    setIsResubmission(false);
    setStage("pending");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-agri-base px-4 py-12">
      <div className="hero-gradient pointer-events-none absolute inset-0" />
      <BrandLogo className="relative mb-6" size="lg" />

      {stage === "role-select" && (
        <>
          <h1
            className="text-center text-3xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Welcome to <BrandName className="text-3xl" />!
          </h1>
          <h2 className="mt-2 text-center text-xl font-semibold text-accent-blue">Choose your role</h2>
          <p className="mb-8 mt-1 text-center text-sm text-agri-muted">
            Select the workspace that best matches how you use AgriTrust.
          </p>

          {error ? (
            <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4">
            {roles.map(({ role, icon: Icon, color, bg, border, glow, selectedGlow, title, description }) => {
              const isSelected = selectedRole === role;

              return (
                <button
                  key={role}
                  className={`glass w-52 cursor-pointer rounded-2xl border-2 bg-agri-surface p-6 transition-all duration-150 hover:-translate-y-1 hover:scale-[1.02] ${
                    isSelected ? `${border} ${selectedGlow}` : "border-agri-border hover:border-agri-border-focus"
                  }`}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                >
                  <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${bg} ${glow}`}>
                    <Icon className={`h-10 w-10 ${color}`} />
                  </div>
                  <h3 className="mt-4 text-center font-bold text-agri-text">{title}</h3>
                  <p className="mt-2 text-center text-sm text-agri-muted">{description}</p>
                </button>
              );
            })}
          </div>

          <button
            className={`mt-8 rounded-xl px-8 py-3 font-semibold text-white ${
              selectedRole
                ? "bg-accent-blue hover:bg-accent-blue/90"
                : "cursor-not-allowed bg-accent-blue/50 opacity-50"
            }`}
            type="button"
            disabled={!selectedRole || isSaving}
            onClick={handleRoleContinue}
          >
            {isSaving ? "Saving..." : "Continue"}
          </button>
        </>
      )}

      {stage === "farm-details" && (
        <div className="glass relative z-10 w-full max-w-lg rounded-2xl border border-agri-border bg-agri-surface p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
          <h1
            className="text-2xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Farm Details
          </h1>
          <p className="mt-1 text-sm text-agri-muted">
            Tell us about your farm to set up your producer profile.
          </p>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          {!isConnected ? (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-amber" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-agri-text">Wallet Connection Required</h4>
                  <p className="mt-1 text-xs text-agri-muted">
                    Connect your wallet before completing setup — AgriTrust requires your wallet address to register produce batches.
                  </p>

                  <button
                    type="button"
                    onClick={() => openConnectModal?.()}
                    className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-blue/90"
                  >
                    <Wallet className="h-4 w-4" />
                    Connect Web3 Wallet
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-between rounded-xl border border-agri-border bg-agri-raised p-3 px-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent-green" />
                <span className="text-xs font-medium text-agri-muted">Connected Wallet:</span>
                <span className="font-mono text-xs text-agri-text">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openConnectModal?.()}
                className="text-xs text-accent-blue hover:underline"
              >
                Change
              </button>
            </div>
          )}

          <form onSubmit={handleFarmDetailsSubmit} className="mt-6 flex flex-col gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-agri-muted">
                Farm name <span className="text-red-400">*</span>
              </span>
              <input
                required
                type="text"
                className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text placeholder:text-agri-muted focus:border-agri-border-focus focus:outline-none"
                placeholder="e.g. Okafor Family Farm"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-agri-muted">
                Farm location <span className="text-red-400">*</span>
              </span>
              <input
                required
                type="text"
                className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text placeholder:text-agri-muted focus:border-agri-border-focus focus:outline-none"
                placeholder="e.g. Rivers State, Nigeria"
                value={farmLocation}
                onChange={(e) => setFarmLocation(e.target.value)}
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-agri-muted">
                  GPS coordinates <span className="text-xs text-agri-muted">(optional)</span>
                </span>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent-blue hover:underline"
                >
                  How to find this (Google Maps)
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <input
                type="text"
                className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 font-mono text-sm text-agri-text placeholder:text-agri-muted focus:border-agri-border-focus focus:outline-none"
                placeholder="e.g. 4.8156° N, 7.0498° E"
                value={gpsCoordinates}
                onChange={(e) => setGpsCoordinates(e.target.value)}
              />
            </label>

            <div>
              <span className="mb-1.5 block text-sm text-agri-muted">Primary crops</span>
              <div className="flex flex-wrap gap-2 rounded-lg border border-agri-border bg-agri-raised p-3">
                {AVAILABLE_CROPS.map((crop) => {
                  const isSelected = crops.includes(crop);
                  return (
                    <button
                      key={crop}
                      type="button"
                      onClick={() => toggleCrop(crop)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border border-accent-green/40 bg-accent-green/20 text-accent-green"
                          : "border border-agri-border bg-agri-surface text-agri-muted hover:border-agri-border-focus hover:text-agri-text"
                      }`}
                    >
                      {crop}
                      {isSelected ? <Check className="h-3 w-3" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm text-agri-muted">
                NASC registration number <span className="text-xs text-agri-muted">(optional)</span>
              </span>
              <input
                type="text"
                className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 font-mono text-sm text-agri-text placeholder:text-agri-muted focus:border-agri-border-focus focus:outline-none"
                placeholder="e.g. NASC-NG-04821"
                value={nascRegistration}
                onChange={(e) => setNascRegistration(e.target.value)}
              />
            </label>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStage("role-select");
                }}
                className="rounded-xl border border-agri-border px-4 py-3 text-sm font-semibold text-agri-text hover:bg-agri-raised"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!isConnected || isSaving}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-colors ${
                  !isConnected || isSaving
                    ? "cursor-not-allowed bg-accent-green/50 opacity-50"
                    : "bg-accent-green hover:bg-accent-green/90"
                }`}
              >
                <Sprout className="h-4 w-4" />
                {isSaving ? "Setting up your farm..." : "Complete Setup →"}
              </button>
            </div>
          </form>
        </div>
      )}

      {stage === "credential-submission" && (
        <div className="glass relative z-10 w-full max-w-lg rounded-2xl border border-agri-border bg-agri-surface p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
          <h1
            className="text-2xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            {isResubmission ? "Resubmit Credentials" : "Submit your credentials"}
          </h1>
          <p className="mt-1 text-sm text-agri-muted">
            A regulator will review and approve your account before you can access the dashboard.
          </p>

          {isResubmission ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent-amber/40 bg-accent-amber/10 p-4 text-accent-amber">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-amber" />
              <div className="text-xs">
                <p className="font-semibold">Application Resubmission</p>
                <p className="mt-0.5 text-agri-muted">
                  Your previous application was not approved. Please review and resubmit your credentials below.
                </p>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          {!isConnected ? (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-amber" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-agri-text">Wallet Connection Required</h4>
                  <p className="mt-1 text-xs text-agri-muted">
                    Connect your wallet before submitting — the Regulator needs your wallet address to approve your account.
                  </p>

                  <button
                    type="button"
                    onClick={() => openConnectModal?.()}
                    className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-blue/90"
                  >
                    <Wallet className="h-4 w-4" />
                    Connect Web3 Wallet
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-between rounded-xl border border-agri-border bg-agri-raised p-3 px-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent-green" />
                <span className="text-xs font-medium text-agri-muted">Connected Wallet:</span>
                <span className="font-mono text-xs text-agri-text">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openConnectModal?.()}
                className="text-xs text-accent-blue hover:underline"
              >
                Change
              </button>
            </div>
          )}

          <form onSubmit={handleCredentialSubmit} className="mt-6 flex flex-col gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-agri-muted">
                License / certification number <span className="text-red-400">*</span>
              </span>
              <input
                required
                type="text"
                className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text placeholder:text-agri-muted focus:border-agri-border-focus focus:outline-none"
                placeholder={
                  selectedRole === "INSPECTOR"
                    ? "e.g. NAFDAC-INS-2024-0417"
                    : "e.g. NAFDAC-DIST-2024-0417"
                }
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-agri-muted">
                Certifying body <span className="text-red-400">*</span>
              </span>
              <input
                required
                type="text"
                className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text placeholder:text-agri-muted focus:border-agri-border-focus focus:outline-none"
                placeholder="e.g. NAFDAC"
                value={certifyingBody}
                onChange={(e) => setCertifyingBody(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-agri-muted">
                Supporting document <span className="text-xs text-agri-muted">(optional)</span>
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text file:mr-4 file:rounded-md file:border-0 file:bg-agri-surface file:px-3 file:py-1 file:text-xs file:font-semibold file:text-agri-text hover:file:bg-agri-raised placeholder:text-agri-muted focus:border-agri-border-focus focus:outline-none"
                onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStage("role-select");
                }}
                className="rounded-xl border border-agri-border px-4 py-3 text-sm font-semibold text-agri-text hover:bg-agri-raised"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!isConnected || isSaving}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-colors ${
                  !isConnected || isSaving
                    ? "cursor-not-allowed bg-accent-blue/50 opacity-50"
                    : "bg-accent-blue hover:bg-accent-blue/90"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                {isSaving ? "Submitting..." : isResubmission ? "Resubmit for Review →" : "Submit for Review →"}
              </button>
            </div>
          </form>
        </div>
      )}

      {stage === "pending" && (
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
            A Regulator will review your credentials and wallet address. You&apos;ll be able to access your dashboard once approved.
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
      )}

      <footer className="mt-12 border-t border-agri-border pt-6 text-center text-xs text-agri-muted">
        © 2026 AgriTrust. All Rights Reserved. Team Innovaro
      </footer>
    </main>
  );
}
