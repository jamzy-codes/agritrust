"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Leaf,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Sprout,
  TestTube,
  Truck,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import {
  complianceRegistryContract,
  produceRegistryContract,
  supplyChainLedgerContract,
} from "@/lib/contracts";
import { PRIMARY_BATCH, TX_HASHES } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

type ActiveTab = "new" | "verify" | "handoff";
type GMOResult = "NON_GMO" | "GMO_PRESENT";
type HandoffType =
  | "Warehouse to Distributor"
  | "Distributor to Distributor"
  | "Distributor to Market";

interface NewBatchForm {
  cropType: string;
  grade: string;
  quantityKg: string;
  seedVariety: string;
  isGMOFree: boolean;
  practices: string;
  farmName: string;
  farmLocation: string;
  gpsCoordinates: string;
  registrationDate: string;
}

const fieldClassName =
  "w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text placeholder:text-agri-muted transition-colors focus:border-agri-border-focus focus:outline-none";

const roleTabs: Record<UserRole, ActiveTab[]> = {
  FARMER: ["new"],
  INSPECTOR: ["verify"],
  DISTRIBUTOR: ["handoff"],
  REGULATOR: [],
  CONSUMER: [],
};

function PageHeading() {
  return (
    <header className="mb-6 px-8 pt-8">
      <h1
        className="text-3xl font-bold text-agri-text"
        style={{ fontFamily: "var(--font-outfit)" }}
      >
        Register
      </h1>
      <p className="mt-1 text-agri-muted">
        Register produce, verify biosafety, and record trusted custody handoffs.
      </p>
    </header>
  );
}

function SectionIntro({
  icon: Icon,
  eyebrow,
  title,
  copy,
  color,
}: {
  icon: typeof Sprout;
  eyebrow: string;
  title: string;
  copy: string;
  color: string;
}) {
  return (
    <section className="mb-4 px-8">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className={`text-xs font-bold tracking-widest ${color}`}>
          {eyebrow}
        </span>
      </div>
      <h2
        className="text-2xl font-bold text-agri-text"
        style={{ fontFamily: "var(--font-outfit)" }}
      >
        {title}
      </h2>
      <p className="mb-6 mt-1 text-sm text-agri-muted">{copy}</p>
    </section>
  );
}

function SearchRow({
  buttonColor,
  value,
  onChange,
}: {
  buttonColor: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="mb-6 flex gap-3 px-8">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
        <input
          className={`${fieldClassName} pl-9`}
          placeholder="Enter batch ID or scan QR code..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <button
        className="rounded-lg border border-agri-border px-3 text-agri-muted hover:text-accent-green"
        type="button"
      >
        <QrCode className="h-4 w-4" />
      </button>
      <button
        className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white ${buttonColor}`}
        type="button"
      >
        Load Batch
      </button>
    </div>
  );
}

function LoadedBatchCard({
  batchId,
  status,
}: {
  batchId: string;
  status: "AWAITING INSPECTION" | "CERTIFIED";
}) {
  return (
    <div className="mx-8 mb-6 flex items-center gap-4 rounded-xl border border-agri-border bg-agri-raised p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-green/20">
        <Leaf className="h-5 w-5 text-accent-green" />
      </div>
      <div className="flex-1">
        <p className="font-mono font-bold text-agri-text">
          {batchId || PRIMARY_BATCH.batchId}
        </p>
        <p className="text-sm text-agri-muted">
          {PRIMARY_BATCH.cropType} · {PRIMARY_BATCH.quantityKg} kg
        </p>
        <p className="mt-0.5 text-xs text-agri-muted">
          Farm: {PRIMARY_BATCH.farmName}, {PRIMARY_BATCH.region}
        </p>
        <p className="text-xs text-agri-muted">
          Registered: {PRIMARY_BATCH.registeredAt}
        </p>
      </div>
      <span
        className={`ml-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
          status === "CERTIFIED"
            ? "bg-accent-green/20 text-accent-green"
            : "bg-accent-amber/20 text-accent-amber"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function NewBatchTab() {
  const today = new Date().toISOString().split("T")[0];
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  const [form, setForm] = useState<NewBatchForm>({
    cropType: "",
    grade: "",
    quantityKg: "",
    seedVariety: "",
    isGMOFree: true,
    practices: "",
    farmName: "",
    farmLocation: "",
    gpsCoordinates: "6.5244, 3.3792",
    registrationDate: today,
  });
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [userFarm, setUserFarm] = useState<{ id: string; farm_name: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [batchId] = useState<string>(
    () => `AGT-${Math.floor(1000 + Math.random() * 9000)}`
  );

  const [statusStage, setStatusStage] = useState<
    "idle" | "wallet_pending" | "confirming_onchain" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    async function loadUserFarm() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (!userError && userData.user) {
        setUserId(userData.user.id);
        const { data: farm } = await supabase
          .from("farms")
          .select("*")
          .eq("owner_id", userData.user.id)
          .maybeSingle();

        if (farm) {
          setUserFarm({ id: farm.id, farm_name: farm.farm_name });
          setForm((prev) => ({
            ...prev,
            farmName: prev.farmName || farm.farm_name || "",
            farmLocation: prev.farmLocation || farm.location || "",
            gpsCoordinates:
              prev.gpsCoordinates && prev.gpsCoordinates !== "6.5244, 3.3792"
                ? prev.gpsCoordinates
                : farm.gps_coordinates || "6.5244, 3.3792",
          }));
        }
      }
    }
    loadUserFarm();
  }, []);

  useEffect(() => {
    if (isConfirmed && txHash && statusStage === "confirming_onchain") {
      async function saveToSupabase() {
        try {
          const { error: dbError } = await supabase.from("batches").insert({
            batch_id: batchId,
            farm_id: userFarm?.id || null,
            registered_by: userId,
            crop_type: form.cropType,
            quantity_kg: parseFloat(form.quantityKg || "0"),
            seed_variety: form.seedVariety || null,
            is_gmo_free: form.isGMOFree,
            gmo_status: "farmer_declared",
            status: "REGISTERED",
            tx_hash: txHash,
            registered_at: new Date().toISOString(),
          });

          if (dbError) {
            console.error("Supabase insert error:", dbError);
            setErrorMessage(`Blockchain confirmed, but database insert failed: ${dbError.message}`);
            setStatusStage("error");
          } else {
            setStatusStage("success");
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          setErrorMessage(`Database write failed: ${message}`);
          setStatusStage("error");
        }
      }
      saveToSupabase();
    }
  }, [isConfirmed, txHash, statusStage, batchId, userFarm?.id, userId, form]);

  function updateField<K extends keyof NewBatchForm>(
    field: K,
    value: NewBatchForm[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleRegisterBatch() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (!form.cropType || !form.quantityKg) {
      setErrorMessage("Please fill in required fields (Crop type and Quantity).");
      setStatusStage("error");
      return;
    }

    setErrorMessage("");
    setStatusStage("wallet_pending");

    try {
      const quantityVal = BigInt(Math.round(parseFloat(form.quantityKg || "0")));
      const farmIdVal = userFarm?.id || userFarm?.farm_name || "FARM-001";

      const hash = await writeContractAsync({
        address: produceRegistryContract.address,
        abi: produceRegistryContract.abi,
        functionName: "registerBatch",
        args: [
          batchId,
          form.cropType,
          quantityVal,
          form.seedVariety || "Standard",
          form.isGMOFree,
          farmIdVal,
        ],
      });

      setTxHash(hash);
      setStatusStage("confirming_onchain");
    } catch (err: unknown) {
      console.error("Contract call error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setStatusStage("error");
      if (message.includes("User rejected") || message.includes("user rejected")) {
        setErrorMessage("Transaction was rejected in your wallet.");
      } else {
        setErrorMessage(`Transaction failed: ${message}`);
      }
    }
  }

  const previewRows = [
    ["Batch ID", batchId],
    ["Crop Type", form.cropType],
    ["Grade", form.grade],
    ["Quantity", form.quantityKg ? `${form.quantityKg} kg` : ""],
    ["Seed Variety", form.seedVariety],
    ["GMO Status", form.isGMOFree ? "GMO-free" : "GMO present"],
    ["Farm Name", form.farmName],
    ["Farm Location", form.farmLocation],
    ["GPS Coordinates", form.gpsCoordinates],
    ["Registration Date", form.registrationDate],
  ];

  return (
    <>
      <SectionIntro
        icon={Sprout}
        eyebrow="BATCH REGISTRATION"
        title="Register New Produce Batch"
        copy="Capture crop identity and farm declarations before minting a traceable batch record."
        color="text-accent-green"
      />

      <section className="grid grid-cols-1 gap-6 px-8 xl:grid-cols-[1fr_340px]">
        <div className="rounded-xl glass p-6">
          <div className="mb-8 flex items-center gap-0">
            {["Batch Info", "Farm Details", "Confirmation"].map(
              (label, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep === stepNumber;
                const isComplete = currentStep > stepNumber;

                return (
                  <div
                    key={label}
                    className="flex flex-1 items-center last:flex-none"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          isActive || isComplete
                            ? "bg-accent-green text-white"
                            : "border border-agri-border bg-agri-raised text-agri-muted"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`mt-1 text-xs ${
                          isActive || isComplete
                            ? "text-accent-green"
                            : "text-agri-muted"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {index < 2 ? (
                      <div className="mx-3 h-px flex-1 bg-agri-border" />
                    ) : null}
                  </div>
                );
              }
            )}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {currentStep === 1 ? (
              <>
                <label>
                  <span className="mb-1 block text-sm text-agri-muted">
                    Crop type
                  </span>
                  <select
                    className={fieldClassName}
                    value={form.cropType}
                    onChange={(event) =>
                      updateField("cropType", event.target.value)
                    }
                  >
                    <option value="">Select crop</option>
                    {[
                      "Cocoa",
                      "Cassava",
                      "Cashew",
                      "Yam",
                      "Maize",
                      "Palm Oil",
                      "Other",
                    ].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-sm text-agri-muted">
                    Grade/Quality
                  </span>
                  <input
                    className={fieldClassName}
                    placeholder="e.g. Grade A"
                    value={form.grade}
                    onChange={(event) =>
                      updateField("grade", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm text-agri-muted">
                    Quantity kg
                  </span>
                  <input
                    className={fieldClassName}
                    type="number"
                    value={form.quantityKg}
                    onChange={(event) =>
                      updateField("quantityKg", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm text-agri-muted">
                    Seed variety
                  </span>
                  <select
                    className={fieldClassName}
                    value={form.seedVariety}
                    onChange={(event) =>
                      updateField("seedVariety", event.target.value)
                    }
                  >
                    <option value="">Select seed variety</option>
                    <option>NASC OC-7</option>
                    <option>NASC OC-4</option>
                    <option>Other Certified</option>
                    <option>Other</option>
                  </select>
                </label>

                <button
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-agri-border bg-agri-raised p-3"
                  type="button"
                  onClick={() => updateField("isGMOFree", !form.isGMOFree)}
                >
                  <span className="flex items-center gap-2 text-sm text-agri-text">
                    <TestTube className="h-4 w-4 text-agri-muted" />
                    GMO-free declaration
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      form.isGMOFree
                        ? "bg-accent-green/20 text-accent-green"
                        : "bg-accent-red/20 text-accent-red"
                    }`}
                  >
                    {form.isGMOFree ? "✓ GMO-FREE" : "GMO PRESENT"}
                  </span>
                </button>

                <label>
                  <span className="mb-1 block text-sm text-agri-muted">
                    Farming practices
                  </span>
                  <textarea
                    className={fieldClassName}
                    rows={4}
                    placeholder="Describe pesticide use, irrigation method, harvesting approach..."
                    value={form.practices}
                    onChange={(event) =>
                      updateField("practices", event.target.value)
                    }
                  />
                </label>

                <button
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-green py-2.5 font-medium text-white transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  type="button"
                  onClick={() => setCurrentStep(2)}
                >
                  Next Step
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : null}

            {currentStep === 2 ? (
              <>
                <label>
                  <span className="mb-1 block text-sm text-agri-muted">
                    Farm name
                  </span>
                  <input
                    className={fieldClassName}
                    placeholder="e.g. Green Valley Farm"
                    value={form.farmName}
                    onChange={(event) =>
                      updateField("farmName", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm text-agri-muted">
                    Farm location
                  </span>
                  <input
                    className={fieldClassName}
                    placeholder="e.g. Ibadan, Oyo State"
                    value={form.farmLocation}
                    onChange={(event) =>
                      updateField("farmLocation", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm text-agri-muted">
                    GPS coordinates
                  </span>
                  <input
                    className={fieldClassName}
                    value={form.gpsCoordinates}
                    onChange={(event) =>
                      updateField("gpsCoordinates", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm text-agri-muted">
                    Registration date
                  </span>
                  <input
                    className={fieldClassName}
                    type="date"
                    value={form.registrationDate}
                    onChange={(event) =>
                      updateField("registrationDate", event.target.value)
                    }
                  />
                </label>

                <div className="mt-2 flex gap-3">
                  <button
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-agri-border bg-agri-raised py-2.5 font-medium text-agri-text"
                    type="button"
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeftRight className="h-4 w-4 rotate-180" />
                    Back
                  </button>
                  <button
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-green py-2.5 font-medium text-white transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                    type="button"
                    onClick={() => setCurrentStep(3)}
                  >
                    Next Step
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : null}

            {currentStep === 3 ? (
              <>
                <div className="rounded-lg border border-agri-border bg-agri-raised p-4">
                  <h3 className="text-sm font-semibold text-agri-text">
                    Confirmation summary
                  </h3>
                  <div className="mt-3 space-y-2">
                    {[
                      ["Generated Batch ID", batchId],
                      ["Crop Type", form.cropType],
                      ["Grade/Quality", form.grade],
                      [
                        "Quantity",
                        form.quantityKg ? `${form.quantityKg} kg` : "",
                      ],
                      ["Seed Variety", form.seedVariety],
                      [
                        "GMO Status",
                        form.isGMOFree ? "GMO-free" : "GMO present",
                      ],
                      ["Farming Practices", form.practices],
                      ["Farm Name", form.farmName],
                      ["Farm Location", form.farmLocation],
                      ["GPS Coordinates", form.gpsCoordinates],
                      ["Registration Date", form.registrationDate],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 border-b border-agri-border py-2 last:border-0"
                      >
                        <span className="text-xs text-agri-muted">{label}</span>
                        <span className="text-right text-xs font-medium text-agri-text">
                          {value || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {statusStage === "success" && txHash ? (
                  <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-accent-green space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      Batch Registered Successfully!
                    </div>
                    <p className="text-xs text-agri-muted">
                      Batch ID: <span className="font-mono text-agri-text">{batchId}</span>
                    </p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>Transaction Hash:</span>
                      <a
                        href={`https://amoy.polygonscan.com/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono underline hover:text-accent-green flex items-center gap-1"
                      >
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ) : null}

                {statusStage === "error" && errorMessage ? (
                  <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                {!isConnected ? (
                  <button
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-amber py-2.5 font-medium text-white transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                    type="button"
                    onClick={() => openConnectModal?.()}
                  >
                    <Wallet className="h-4 w-4" />
                    Connect Wallet to Submit
                  </button>
                ) : (
                  <div className="mt-2 flex gap-3">
                    <button
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-agri-border bg-agri-raised py-2.5 font-medium text-agri-text"
                      type="button"
                      disabled={statusStage === "wallet_pending" || statusStage === "confirming_onchain"}
                      onClick={() => setCurrentStep(2)}
                    >
                      <ArrowLeftRight className="h-4 w-4 rotate-180" />
                      Back
                    </button>
                    <button
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-green py-2.5 font-medium text-white transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] disabled:opacity-50"
                      type="button"
                      disabled={statusStage === "wallet_pending" || statusStage === "confirming_onchain" || statusStage === "success"}
                      onClick={handleRegisterBatch}
                    >
                      {statusStage === "wallet_pending" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Confirm in wallet...
                        </>
                      ) : statusStage === "confirming_onchain" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Confirming transaction...
                        </>
                      ) : (
                        "Submit Registration"
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        <aside className="sticky top-24 self-start rounded-xl glass p-5">
          <h3 className="mb-4 text-sm font-semibold text-agri-text">
            Registration preview
          </h3>
          {previewRows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between border-b border-agri-border py-2 last:border-0"
            >
              <span className="text-xs text-agri-muted">{label}</span>
              <span className="text-xs font-medium text-agri-text">
                {value || "—"}
              </span>
            </div>
          ))}

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent-purple/30 bg-accent-purple/10 p-4">
            <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple" />
            <p className="text-xs text-agri-muted">
              Once submitted, this batch will be assigned an on-chain ID and a
              QR code will be generated automatically.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}

function VerifyBatchTab() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  const [searchBatchId, setSearchBatchId] = useState<string>("AGT-0042");
  const [weightKg, setWeightKg] = useState<string>("498.5");
  const [qualityGrade, setQualityGrade] = useState<string>("Grade A - Premium");
  const [storageCondition, setStorageCondition] = useState<string>("Optimal");
  const [gmoResult, setGmoResult] = useState<GMOResult>("NON_GMO");
  const [biosafetyGrade, setBiosafetyGrade] = useState<string>("A+");
  const [meetsNAFDAC, setMeetsNAFDAC] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [inspectorId, setInspectorId] = useState<string>("NAFDAC-0042");
  const [userId, setUserId] = useState<string | null>(null);

  const [statusStage, setStatusStage] = useState<
    | "idle"
    | "wallet_pending_insp"
    | "confirming_insp"
    | "wallet_pending_cert"
    | "confirming_cert"
    | "success"
    | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [inspTxHash, setInspTxHash] = useState<`0x${string}` | undefined>();
  const [certTxHash, setCertTxHash] = useState<`0x${string}` | undefined>();

  // Track confirmation for inspection transaction
  const { isSuccess: isInspConfirmed } = useWaitForTransactionReceipt({ hash: inspTxHash });
  // Track confirmation for certificate transaction
  const { isSuccess: isCertConfirmed } = useWaitForTransactionReceipt({ hash: certTxHash });

  useEffect(() => {
    async function loadUser() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (!userError && userData.user) {
        setUserId(userData.user.id);
      }
    }
    loadUser();
  }, []);

  // Step 2: Trigger issueCertificate automatically after recordInspection is confirmed on-chain
  useEffect(() => {
    if (isInspConfirmed && inspTxHash && statusStage === "confirming_insp") {
      async function triggerIssueCertificate() {
        setStatusStage("wallet_pending_cert");
        try {
          const certIdVal = `CERT-${searchBatchId}-${Math.floor(1000 + Math.random() * 9000)}`;
          const validFromVal = BigInt(Math.floor(Date.now() / 1000));
          const validUntilVal = validFromVal + BigInt(31536000); // 1 year validity (365 days)

          const hash = await writeContractAsync({
            address: complianceRegistryContract.address,
            abi: complianceRegistryContract.abi,
            functionName: "issueCertificate",
            args: [searchBatchId, certIdVal, validFromVal, validUntilVal],
          });

          setCertTxHash(hash);
          setStatusStage("confirming_cert");
        } catch (err: unknown) {
          console.error("Certificate issuance error:", err);
          const message = err instanceof Error ? err.message : String(err);
          setStatusStage("error");
          if (message.includes("User rejected") || message.includes("user rejected")) {
            setErrorMessage("Inspection was recorded, but certificate issuance was rejected in your wallet.");
          } else {
            setErrorMessage(`Inspection was recorded, but certificate issuance failed: ${message}`);
          }
        }
      }
      triggerIssueCertificate();
    }
  }, [isInspConfirmed, inspTxHash, statusStage, searchBatchId, writeContractAsync]);

  // Step 3: Insert into Supabase only after BOTH recordInspection AND issueCertificate are confirmed
  useEffect(() => {
    if (isCertConfirmed && certTxHash && statusStage === "confirming_cert") {
      async function recordInspectionSuccess() {
        try {
          const combinedTxHash = certTxHash || inspTxHash;

          const { error: inspError } = await supabase
            .from("inspections")
            .insert({
              batch_id: searchBatchId,
              inspector_id: userId,
              weight_kg: parseFloat(weightKg || "0"),
              quality_grade: qualityGrade,
              gmo_test_result: gmoResult,
              certificate_issued: true,
              tx_hash: combinedTxHash,
              inspected_at: new Date().toISOString(),
            });

          if (inspError) {
            console.error("Inspections table insert error:", inspError);
          }

          const { error: batchError } = await supabase
            .from("batches")
            .update({
              gmo_status: "inspector_verified",
              status: "INSPECTED",
            })
            .eq("batch_id", searchBatchId);

          if (batchError) {
            console.error("Batches table update error:", batchError);
          }

          setStatusStage("success");
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          setErrorMessage(`Database update failed: ${message}`);
          setStatusStage("error");
        }
      }
      recordInspectionSuccess();
    }
  }, [isCertConfirmed, certTxHash, inspTxHash, statusStage, searchBatchId, userId, weightKg, qualityGrade, gmoResult]);

  async function handleSubmitInspection() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    setErrorMessage("");
    setStatusStage("wallet_pending_insp");

    try {
      const gmoStatusVal = gmoResult === "NON_GMO" ? 1 : 2;
      const weightVal = BigInt(Math.round(parseFloat(weightKg || "0")));

      const hash = await writeContractAsync({
        address: complianceRegistryContract.address,
        abi: complianceRegistryContract.abi,
        functionName: "recordInspection",
        args: [
          searchBatchId,
          inspectorId,
          weightVal,
          qualityGrade,
          gmoStatusVal,
          biosafetyGrade,
          meetsNAFDAC,
          notes,
        ],
      });

      setInspTxHash(hash);
      setStatusStage("confirming_insp");
    } catch (err: unknown) {
      console.error("Inspection error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setStatusStage("error");

      if (
        message.includes("Not an inspector") ||
        message.includes("onlyInspector") ||
        message.includes("not approved")
      ) {
        setErrorMessage(
          "Your wallet is not yet approved as an Inspector. Contact your Regulator."
        );
      } else if (
        message.includes("User rejected") ||
        message.includes("user rejected")
      ) {
        setErrorMessage("Transaction was rejected in your wallet.");
      } else {
        setErrorMessage(`Inspection submission failed: ${message}`);
      }
    }
  }

  const isProcessing =
    statusStage === "wallet_pending_insp" ||
    statusStage === "confirming_insp" ||
    statusStage === "wallet_pending_cert" ||
    statusStage === "confirming_cert";

  return (
    <>
      <SectionIntro
        icon={ShieldCheck}
        eyebrow="BIOSAFETY INSPECTION"
        title="Verify & Inspect Batch"
        copy="Load a registered batch and issue an immutable biosafety inspection record."
        color="text-accent-blue"
      />
      <SearchRow
        buttonColor="bg-accent-blue"
        value={searchBatchId}
        onChange={setSearchBatchId}
      />
      <LoadedBatchCard batchId={searchBatchId} status="AWAITING INSPECTION" />

      <section className="grid grid-cols-1 gap-6 px-8 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4 rounded-xl glass p-6">
          <label>
            <span className="mb-1 block text-sm text-agri-muted">
              Physical weight (kg)
            </span>
            <input
              className={fieldClassName}
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm text-agri-muted">
              Quality assessment
            </span>
            <select
              className={fieldClassName}
              value={qualityGrade}
              onChange={(e) => setQualityGrade(e.target.value)}
            >
              <option>Grade A - Premium</option>
              <option>Grade A</option>
              <option>Grade B</option>
              <option>Grade C</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm text-agri-muted">
              Storage condition
            </span>
            <select
              className={fieldClassName}
              value={storageCondition}
              onChange={(e) => setStorageCondition(e.target.value)}
            >
              <option>Optimal</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
            </select>
          </label>

          <div>
            <span className="mb-2 block text-sm text-agri-muted">
              GMO test result
            </span>
            <div className="flex gap-3">
              <button
                className={`flex-1 rounded-xl border-2 p-3 text-center text-sm font-semibold transition-all ${
                  gmoResult === "NON_GMO"
                    ? "border-accent-green bg-accent-green/20 text-accent-green"
                    : "border-agri-border text-agri-muted"
                }`}
                type="button"
                onClick={() => setGmoResult("NON_GMO")}
              >
                NON-GMO CONFIRMED
              </button>
              <button
                className={`flex-1 rounded-xl border-2 p-3 text-center text-sm font-semibold transition-all ${
                  gmoResult === "GMO_PRESENT"
                    ? "border-accent-red bg-accent-red/20 text-accent-red"
                    : "border-agri-border text-agri-muted"
                }`}
                type="button"
                onClick={() => setGmoResult("GMO_PRESENT")}
              >
                GMO PRESENT
              </button>
            </div>
          </div>

          <label>
            <span className="mb-1 block text-sm text-agri-muted">
              Biosafety grade
            </span>
            <select
              className={fieldClassName}
              value={biosafetyGrade}
              onChange={(e) => setBiosafetyGrade(e.target.value)}
            >
              <option>A+</option>
              <option>A</option>
              <option>B+</option>
              <option>B</option>
              <option>C</option>
              <option>Fail</option>
            </select>
          </label>

          <label className="flex items-center gap-3 text-sm text-agri-text cursor-pointer">
            <input
              className="h-4 w-4 accent-accent-blue"
              type="checkbox"
              checked={meetsNAFDAC}
              onChange={(e) => setMeetsNAFDAC(e.target.checked)}
            />
            Meets NAFDAC standards
          </label>

          <label>
            <span className="mb-1 block text-sm text-agri-muted">
              Inspector notes
            </span>
            <textarea
              className={fieldClassName}
              rows={3}
              placeholder="Add inspection notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm text-agri-muted">
              Inspector ID
            </span>
            <input
              className={`${fieldClassName} font-mono`}
              value={inspectorId}
              onChange={(e) => setInspectorId(e.target.value)}
            />
          </label>

          {statusStage === "success" && (certTxHash || inspTxHash) ? (
            <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-accent-green space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                Inspection & Biosafety Certificate Issued Successfully!
              </div>
              <div className="flex flex-col gap-1 text-xs">
                {inspTxHash ? (
                  <div className="flex items-center gap-1.5">
                    <span>Inspection Tx:</span>
                    <a
                      href={`https://amoy.polygonscan.com/tx/${inspTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono underline hover:text-accent-green flex items-center gap-1"
                    >
                      {inspTxHash.slice(0, 10)}...{inspTxHash.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : null}
                {certTxHash ? (
                  <div className="flex items-center gap-1.5">
                    <span>Certificate Tx:</span>
                    <a
                      href={`https://amoy.polygonscan.com/tx/${certTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono underline hover:text-accent-green flex items-center gap-1"
                    >
                      {certTxHash.slice(0, 10)}...{certTxHash.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {statusStage === "error" && errorMessage ? (
            <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {!isConnected ? (
            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-amber py-3 font-semibold text-white transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              type="button"
              onClick={() => openConnectModal?.()}
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet to Submit
            </button>
          ) : (
            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-blue py-3 font-semibold text-white transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] disabled:opacity-50"
              type="button"
              onClick={handleSubmitInspection}
              disabled={isProcessing || statusStage === "success"}
            >
              {statusStage === "wallet_pending_insp" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirm inspection in wallet... (1/2)
                </>
              ) : statusStage === "confirming_insp" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming inspection on-chain... (1/2)
                </>
              ) : statusStage === "wallet_pending_cert" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirm certificate issuance in wallet... (2/2)
                </>
              ) : statusStage === "confirming_cert" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming certificate on-chain... (2/2)
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  Submit Inspection & Issue Certificate
                </>
              )}
            </button>
          )}

          <div className="mt-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-accent-amber" />
            <p className="text-xs text-agri-muted">
              This action requires 2 wallet confirmations (Inspection + Certificate).
            </p>
          </div>
        </div>

        <aside className="rounded-xl glass p-5">
          <h3 className="mb-4 text-sm font-semibold text-agri-text">
            What happens next
          </h3>
          <div className="flex flex-col gap-0">
            {[
              "Your inspection is recorded as an immutable blockchain transaction.",
              "A biosafety certificate is generated and linked to this batch.",
              "The farmer is notified and the batch status updates to CERTIFIED.",
              "A QR code is activated for consumer verification.",
            ].map((step, index, steps) => (
              <div
                key={step}
                className="relative flex items-start gap-3 pb-6 last:pb-0"
              >
                {index < steps.length - 1 ? (
                  <div className="absolute bottom-0 left-3.5 top-8 border-l-2 border-dashed border-agri-border" />
                ) : null}
                <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-blue/20 text-xs font-bold text-accent-blue">
                  {index + 1}
                </span>
                <p className="text-xs text-agri-text">{step}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}

function HandoffTab() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  const [searchBatchId, setSearchBatchId] = useState<string>("AGT-0042");
  const [handoffType, setHandoffType] = useState<HandoffType>(
    "Warehouse to Distributor"
  );
  const [fromParty, setFromParty] = useState<string>("Warehouse");
  const [receivingPartyName, setReceivingPartyName] = useState<string>("PH Agri Logistics Ltd");
  const [receivingPartyId, setReceivingPartyId] = useState<string>("DIST-0091");
  const [handoffLocation, setHandoffLocation] = useState<string>("Port Harcourt Wharf");
  const [quantityTransferred, setQuantityTransferred] = useState<string>("498.5");
  const [condition, setCondition] = useState<string>("Good condition");
  const [transportMethod, setTransportMethod] = useState<string>("Refrigerated truck");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  const [statusStage, setStatusStage] = useState<
    "idle" | "wallet_pending" | "confirming_onchain" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    async function loadUser() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (!userError && userData.user) {
        setUserId(userData.user.id);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (isConfirmed && txHash && statusStage === "confirming_onchain") {
      async function recordHandoffSuccess() {
        try {
          const { error: handoffErr } = await supabase
            .from("handoffs")
            .insert({
              batch_id: searchBatchId,
              distributor_id: userId,
              from_party: fromParty,
              to_party: receivingPartyName,
              location: handoffLocation,
              condition: condition,
              transport_method: transportMethod,
              tx_hash: txHash,
              handed_off_at: new Date().toISOString(),
            });

          if (handoffErr) {
            console.error("Handoffs table insert error:", handoffErr);
          }

          const targetStatus =
            handoffType === "Distributor to Market" ? "DELIVERED" : "IN_TRANSIT";

          const { error: batchErr } = await supabase
            .from("batches")
            .update({ status: targetStatus })
            .eq("batch_id", searchBatchId);

          if (batchErr) {
            console.error("Batches table update error:", batchErr);
          }

          setStatusStage("success");
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          setErrorMessage(`Database update failed: ${message}`);
          setStatusStage("error");
        }
      }
      recordHandoffSuccess();
    }
  }, [isConfirmed, txHash, statusStage, searchBatchId, userId, fromParty, receivingPartyName, handoffLocation, condition, transportMethod, handoffType]);

  async function handleRecordHandoff() {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    setErrorMessage("");
    setStatusStage("wallet_pending");

    try {
      const isFinalDelivery = handoffType === "Distributor to Market";
      let hash: `0x${string}`;

      if (isFinalDelivery) {
        // Call recordDelivery(batchId, location) on supplyChainLedgerContract for final delivery
        hash = await writeContractAsync({
          address: supplyChainLedgerContract.address,
          abi: supplyChainLedgerContract.abi,
          functionName: "recordDelivery",
          args: [
            searchBatchId,
            handoffLocation || "Location",
          ],
        });
      } else {
        // Call recordHandoff(batchId, fromParty, toParty, location, condition, transportMethod, quantityKg) for in-transit handoff
        const quantityVal = BigInt(Math.round(parseFloat(quantityTransferred || "0")));

        hash = await writeContractAsync({
          address: supplyChainLedgerContract.address,
          abi: supplyChainLedgerContract.abi,
          functionName: "recordHandoff",
          args: [
            searchBatchId,
            fromParty || "Warehouse",
            receivingPartyName || "Distributor",
            handoffLocation || "Location",
            condition || "Good condition",
            transportMethod || "Refrigerated truck",
            quantityVal,
          ],
        });
      }

      setTxHash(hash);
      setStatusStage("confirming_onchain");
    } catch (err: unknown) {
      console.error("Handoff/Delivery error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setStatusStage("error");

      if (
        message.includes("Not an approved distributor") ||
        message.includes("onlyDistributor") ||
        message.includes("not approved")
      ) {
        setErrorMessage(
          "Your wallet is not yet approved as a Distributor. Contact your Regulator."
        );
      } else if (
        message.includes("User rejected") ||
        message.includes("user rejected")
      ) {
        setErrorMessage("Transaction was rejected in your wallet.");
      } else {
        setErrorMessage(`Handoff/Delivery recording failed: ${message}`);
      }
    }
  }

  const isFinalDelivery = handoffType === "Distributor to Market";

  return (
    <>
      <SectionIntro
        icon={Truck}
        eyebrow="HANDOFF RECORDING"
        title="Record Supply Chain Handoff"
        copy="Log custody movement so downstream buyers can verify every step."
        color="text-accent-amber"
      />
      <SearchRow
        buttonColor="bg-accent-amber"
        value={searchBatchId}
        onChange={setSearchBatchId}
      />
      <LoadedBatchCard batchId={searchBatchId} status="CERTIFIED" />

      <section className="grid grid-cols-1 gap-6 px-8 xl:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4 rounded-xl glass p-6">
          <div>
            <span className="mb-2 block text-sm text-agri-muted">
              Handoff type
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "Warehouse to Distributor",
                "Distributor to Distributor",
                "Distributor to Market",
              ].map((type) => (
                <button
                  key={type}
                  className={`cursor-pointer rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                    handoffType === type
                      ? "border-accent-amber bg-accent-amber/20 text-accent-amber"
                      : "border-agri-border text-agri-muted hover:border-accent-amber/50"
                  }`}
                  type="button"
                  onClick={() => setHandoffType(type as HandoffType)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {!isFinalDelivery ? (
            <label>
              <span className="mb-1 block text-sm text-agri-muted">
                From party
              </span>
              <input
                className={fieldClassName}
                placeholder="e.g. Warehouse"
                value={fromParty}
                onChange={(e) => setFromParty(e.target.value)}
              />
            </label>
          ) : null}

          {!isFinalDelivery ? (
            <label>
              <span className="mb-1 block text-sm text-agri-muted">
                Receiving party name
              </span>
              <input
                className={fieldClassName}
                placeholder="e.g. PH Agri Logistics Ltd"
                value={receivingPartyName}
                onChange={(e) => setReceivingPartyName(e.target.value)}
              />
            </label>
          ) : null}

          {!isFinalDelivery ? (
            <label>
              <span className="mb-1 block text-sm text-agri-muted">
                Receiving party ID
              </span>
              <input
                className={`${fieldClassName} font-mono`}
                placeholder="e.g. DIST-0091"
                value={receivingPartyId}
                onChange={(e) => setReceivingPartyId(e.target.value)}
              />
            </label>
          ) : null}

          <label>
            <span className="mb-1 block text-sm text-agri-muted">
              {isFinalDelivery ? "Delivery location" : "Handoff location"}
            </span>
            <div className="relative">
              <input
                className={`${fieldClassName} pr-10`}
                placeholder="e.g. Port Harcourt Wharf"
                value={handoffLocation}
                onChange={(e) => setHandoffLocation(e.target.value)}
              />
              <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
            </div>
          </label>

          {!isFinalDelivery ? (
            <label>
              <span className="mb-1 block text-sm text-agri-muted">
                Quantity transferred
              </span>
              <input
                className={fieldClassName}
                type="number"
                value={quantityTransferred}
                onChange={(e) => setQuantityTransferred(e.target.value)}
              />
            </label>
          ) : null}

          {!isFinalDelivery ? (
            <label>
              <span className="mb-1 block text-sm text-agri-muted">
                Condition on handoff
              </span>
              <select
                className={fieldClassName}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option>Excellent</option>
                <option>Good condition</option>
                <option>Acceptable</option>
                <option>Damaged</option>
              </select>
            </label>
          ) : null}

          {!isFinalDelivery ? (
            <label>
              <span className="mb-1 block text-sm text-agri-muted">
                Transport method
              </span>
              <select
                className={fieldClassName}
                value={transportMethod}
                onChange={(e) => setTransportMethod(e.target.value)}
              >
                <option>Refrigerated truck</option>
                <option>Standard truck</option>
                <option>Rail</option>
                <option>Air freight</option>
                <option>Boat</option>
              </select>
            </label>
          ) : null}

          {!isFinalDelivery ? (
            <label>
              <span className="mb-1 block text-sm text-agri-muted">
                Expected delivery date
              </span>
              <input
                className={fieldClassName}
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </label>
          ) : null}

          {statusStage === "success" && txHash ? (
            <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-accent-green space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                {isFinalDelivery ? "Final Delivery Recorded Successfully!" : "Handoff Recorded Successfully!"}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span>Tx Hash:</span>
                <a
                  href={`https://amoy.polygonscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono underline hover:text-accent-green flex items-center gap-1"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : null}

          {statusStage === "error" && errorMessage ? (
            <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {!isConnected ? (
            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-amber py-3 font-semibold text-white transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              type="button"
              onClick={() => openConnectModal?.()}
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet to Submit
            </button>
          ) : (
            <button
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-amber py-3 font-semibold text-white transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] disabled:opacity-50"
              type="button"
              onClick={handleRecordHandoff}
              disabled={statusStage === "wallet_pending" || statusStage === "confirming_onchain" || statusStage === "success"}
            >
              {statusStage === "wallet_pending" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirm in wallet...
                </>
              ) : statusStage === "confirming_onchain" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming transaction...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  {isFinalDelivery ? "Record Final Delivery on Blockchain" : "Record Handoff on Blockchain"}
                </>
              )}
            </button>
          )}
        </div>

        <aside className="rounded-xl glass p-5">
          <h3 className="mb-3 text-sm font-semibold text-agri-text">
            Why this matters
          </h3>
          <p className="mb-3 text-xs text-agri-muted">
            Every handoff creates an immutable record of who had custody, where
            the batch moved, and what condition it was in.
          </p>
          <p className="mb-4 text-xs text-agri-muted">
            The consumer QR verify page auto-updates as each supply chain
            milestone is confirmed.
          </p>

          <div className="mt-4 rounded-xl border-2 border-accent-amber/30 bg-accent-amber/5 p-3">
            <div className="rounded-lg border border-accent-amber/20 bg-accent-amber/5 p-2">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-3 w-3 text-accent-amber" />
                <p className="font-mono text-[10px] text-accent-amber/70">
                  {txHash ? `${txHash.slice(0, 10)}...` : `${TX_HASHES.inspection.slice(0, 7)}...7c3e`}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

export default function RegisterPage() {
  const [userRole, setUserRole] = useState<UserRole>("FARMER");
  const allowedTabIds = roleTabs[userRole] || ["new"];
  const [activeTab, setActiveTab] = useState<ActiveTab | null>(allowedTabIds[0] ?? "new");

  useEffect(() => {
    async function loadUserRole() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (!userError && userData.user) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("role")
          .eq("id", userData.user.id)
          .single();

        if (userProfile?.role) {
          const role = userProfile.role as UserRole;
          setUserRole(role);
          const tabsForRole = roleTabs[role];
          if (tabsForRole && tabsForRole.length > 0) {
            setActiveTab(tabsForRole[0]);
          }
        }
      }
    }
    loadUserRole();
  }, []);

  const tabs = [
    {
      id: "new" as const,
      icon: Plus,
      label: "New Batch",
      activeClass: "bg-accent-green text-white",
    },
    {
      id: "verify" as const,
      icon: ShieldCheck,
      label: "Verify Batch",
      activeClass: "bg-accent-blue text-white",
    },
    {
      id: "handoff" as const,
      icon: ArrowLeftRight,
      label: "Record Handoff",
      activeClass: "bg-accent-amber text-white",
    },
  ];
  const visibleTabs = tabs.filter((tab) => allowedTabIds.includes(tab.id));

  return (
    <div className="pb-8">
      <PageHeading />

      {allowedTabIds.length === 0 ? (
        <div className="px-8 py-12 text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-agri-muted" />
          <p className="text-agri-muted">
            Regulators do not register batches or record handoffs. Use
            Analytics and Compliance for oversight.
          </p>
        </div>
      ) : null}

      {visibleTabs.length > 1 ? (
        <div className="mb-8 flex gap-2 px-8">
          {visibleTabs.map(({ id, icon: Icon, label, activeClass }) => {
            const isActive = activeTab === id;

            return (
              <button
                key={id}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? activeClass
                    : "border border-agri-border text-agri-muted hover:bg-agri-raised hover:text-agri-text"
                }`}
                type="button"
                onClick={() => setActiveTab(id)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {activeTab === "new" ? <NewBatchTab /> : null}
      {activeTab === "verify" ? <VerifyBatchTab /> : null}
      {activeTab === "handoff" ? <HandoffTab /> : null}
    </div>
  );
}
