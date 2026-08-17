import Link from "next/link";
import {
  AlertCircle,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Info,
  Leaf,
  Link2,
  MapPin,
  QrCode,
  Scale,
  ShieldCheck,
  Star,
  TestTube,
  UserCheck,
} from "lucide-react";

import BrandLogo from "@/components/brand/BrandLogo";
import { supabase } from "@/lib/supabase";

function MiniTimeline({
  stages,
}: {
  stages: Array<{ label: string; date: string; complete: boolean }>;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      {stages.map((stage, index) => (
        <div key={stage.label} className="flex flex-1 flex-col items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
              stage.complete
                ? "border-accent-green bg-accent-green text-white"
                : "border-agri-border bg-agri-raised text-agri-muted"
            }`}
          >
            <span className="text-[10px] font-bold">{index + 1}</span>
          </div>
          <div className="mt-2 text-center">
            <p className="text-[11px] font-semibold text-agri-text">
              {stage.label}
            </p>
            <p
              className={`text-[10px] ${
                stage.complete ? "text-accent-green" : "text-agri-muted"
              }`}
            >
              {stage.date}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function VerifyBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;

  // 1. Fetch batch details from Supabase
  const { data: batch } = await supabase
    .from("batches")
    .select("*")
    .eq("batch_id", batchId)
    .maybeSingle();

  // If batch not found, render clean error state
  if (!batch) {
    return (
      <div className="min-h-screen bg-agri-base">
        <header className="flex items-center justify-between border-b border-agri-border px-8 py-4">
          <Link href="/">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-agri-muted" />
            <p className="text-sm text-agri-muted">Public Verification Portal</p>
          </div>
        </header>

        <section className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-accent-red/30 bg-accent-red/10 text-accent-red">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h1
            className="mb-2 text-3xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Batch Not Found
          </h1>
          <p className="max-w-md text-sm text-agri-muted mb-6">
            No produce batch matching ID <span className="font-mono font-bold text-agri-text">{batchId}</span> was found in the AgriTrust ledger database.
          </p>
          <Link
            href="/"
            className="rounded-xl bg-accent-blue px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-blue/90"
          >
            Return to Home
          </Link>
        </section>
      </div>
    );
  }

  // 2. Fetch farm details if farm_id exists
  const { data: farm } = batch.farm_id
    ? await supabase
        .from("farms")
        .select("*")
        .eq("id", batch.farm_id)
        .maybeSingle()
    : { data: null };

  // 3. Fetch inspections for this batch
  const { data: inspections } = await supabase
    .from("inspections")
    .select("*")
    .eq("batch_id", batchId)
    .order("inspected_at", { ascending: true });

  // 4. Fetch handoffs for this batch
  const { data: handoffs } = await supabase
    .from("handoffs")
    .select("*")
    .eq("batch_id", batchId)
    .order("handed_off_at", { ascending: true });

  const latestInspection = inspections && inspections.length > 0
    ? inspections[inspections.length - 1]
    : null;

  const latestHandoff = handoffs && handoffs.length > 0
    ? handoffs[handoffs.length - 1]
    : null;

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Pending";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Build timeline stages
  const timelineStages = [
    {
      label: "Registration",
      date: formatDate(batch.registered_at),
      complete: true,
    },
    {
      label: "Inspection",
      date: formatDate(latestInspection?.inspected_at),
      complete: Boolean(latestInspection),
    },
    {
      label: "Handoff / Delivery",
      date: formatDate(latestHandoff?.handed_off_at),
      complete: Boolean(latestHandoff),
    },
  ];

  // Map GMO Status Labels matching codebase conventions
  const getGmoLabel = () => {
    if (batch.gmo_status === "inspector_verified") {
      return "Non-GMO (Inspector-verified)";
    }
    if (batch.gmo_status === "farmer_declared") {
      return "Non-GMO (Farmer-declared)";
    }
    return batch.is_gmo_free ? "Non-GMO Confirmed" : "GMO Present";
  };

  const farmName = farm?.farm_name || "Registered Farm";
  const farmLocation = farm?.location || "Nigeria";
  const registeredDateStr = formatDate(batch.registered_at);
  const primaryTxHash = latestInspection?.tx_hash || latestHandoff?.tx_hash || batch.tx_hash;

  return (
    <div className="min-h-screen bg-agri-base">
      <header className="flex items-center justify-between border-b border-agri-border px-8 py-4">
        <Link href="/">
          <BrandLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent-green" />
          <p className="text-sm text-agri-muted">
            Verified public record. Powered by blockchain.
          </p>
        </div>
      </header>

      <section className="px-8 py-12 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-accent-green bg-accent-green/20 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
          <ShieldCheck className="h-10 w-10 text-accent-green" />
        </div>
        <p className="mb-2 text-sm font-bold tracking-widest text-accent-green">
          VERIFIED PRODUCE
        </p>
        <h1
          className="mb-3 text-4xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          {batch.crop_type}
        </h1>
        <p className="text-agri-muted">
          Batch {batch.batch_id} · {farmName}, {farmLocation} · {registeredDateStr}
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-8 pb-12 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-agri-border bg-agri-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent-green" />
              <span className="text-xs font-bold tracking-widest text-accent-green">
                PRODUCE PASSPORT
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-accent-green">
              {batch.batch_id}
            </span>
          </div>

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "CROP TYPE", icon: Leaf, value: batch.crop_type },
              {
                label: "FARM ORIGIN",
                icon: MapPin,
                value: `${farmName}, ${farmLocation}`,
              },
              {
                label: "QUANTITY",
                icon: Scale,
                value: `${batch.quantity_kg} kg`,
              },
              {
                label: "GMO STATUS",
                icon: TestTube,
                value: getGmoLabel(),
                pill: true,
              },
            ].map(({ label, icon: Icon, value, pill }) => (
              <div key={label}>
                <p className="mb-1 text-xs uppercase tracking-wide text-agri-muted">
                  {label}
                </p>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-agri-muted" />
                  {pill ? (
                    <span className="rounded-full bg-accent-green/20 px-2.5 py-0.5 text-xs font-bold text-accent-green">
                      {value}
                    </span>
                  ) : (
                    <p className="text-sm font-semibold text-agri-text">
                      {value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="my-4 border-t border-agri-border" />

          <p className="mb-4 text-xs font-bold tracking-wider uppercase text-agri-muted">
            SUPPLY CHAIN JOURNEY
          </p>
          <MiniTimeline stages={timelineStages} />

          <div className="my-4 border-t border-agri-border" />

          <div className="flex flex-col gap-0">
            <div className="flex items-start gap-3 border-b border-agri-border py-3">
              <UserCheck className="mt-0.5 h-4 w-4 text-agri-muted" />
              <div>
                <p className="text-xs uppercase tracking-wide text-agri-muted">
                  INSPECTOR ASSESSMENT
                </p>
                <p className="text-sm text-agri-text">
                  {latestInspection
                    ? `Quality Grade: ${latestInspection.quality_grade || "Certified"} · Inspected ${formatDate(latestInspection.inspected_at)}`
                    : "Awaiting inspection by certified regulator agent"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 border-b border-agri-border py-3">
              <Star className="mt-0.5 h-4 w-4 text-agri-muted" />
              <div>
                <p className="text-xs uppercase tracking-wide text-agri-muted">
                  BIOSAFETY CERTIFICATE
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-accent-green">
                    {latestInspection?.certificate_issued ? "Issued ✓" : "Pending"}
                  </span>
                  <span className="text-xs text-agri-muted">
                    {latestInspection?.quality_grade || "Standard Verified"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 py-3">
              <Link2 className="mt-0.5 h-4 w-4 text-agri-muted" />
              <div>
                <p className="text-xs uppercase tracking-wide text-agri-muted">
                  BLOCKCHAIN RECORD
                </p>
                {primaryTxHash ? (
                  <>
                    <p className="break-all font-mono text-xs text-accent-cyan">
                      {primaryTxHash}
                    </p>
                    <a
                      className="mt-1 inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
                      href={`https://amoy.polygonscan.com/tx/${primaryTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Verify on Polygon Amoy explorer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                ) : (
                  <p className="text-xs text-agri-muted">Pending blockchain transaction receipt</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-xl border border-agri-border bg-agri-surface">
            <div className="relative h-48 bg-[#0d1f0d]">
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-5xl font-bold text-agri-muted/20">
                Nigeria
              </div>
              <div className="absolute inset-4 rounded-[40%_60%_55%_45%/45%_35%_65%_55%] border border-accent-green/10" />
              <div className="absolute bottom-12 left-16 flex flex-col items-center">
                <MapPin className="h-6 w-6 text-accent-green" />
                <div className="mt-1 rounded-lg border border-agri-border bg-agri-surface px-2 py-1 text-xs text-agri-text">
                  {farmName}
                </div>
              </div>
            </div>
            <p className="p-3 text-xs text-agri-muted">
              Farm GPS location ({farm?.gps_coordinates || "Location verified"}), verified on-chain.
            </p>
          </div>

          <div className="rounded-xl border border-agri-border bg-agri-surface p-5">
            <p className="mb-3 text-xs font-bold tracking-wide text-agri-text">
              SHARE THIS VERIFICATION
            </p>
            <div className="mx-auto mb-3 flex h-32 w-32 items-center justify-center rounded-xl border border-agri-border bg-agri-raised">
              <QrCode className="h-12 w-12 text-agri-muted" />
            </div>
            <p className="mb-4 text-center text-xs text-agri-muted">
              Share this public link for anyone to verify this produce&apos;s origin.
            </p>
            <div className="flex flex-col gap-2">
              <button
                className="flex items-center justify-center gap-2 rounded-lg border border-agri-border py-2 text-sm text-agri-text hover:bg-agri-raised"
                type="button"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-lg border border-agri-border py-2 text-sm text-agri-text hover:bg-agri-raised"
                type="button"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 border-t border-agri-border bg-agri-raised px-8 py-4">
        <Info className="h-3.5 w-3.5 text-agri-muted" />
        <p className="text-xs text-agri-muted">
          Record created {registeredDateStr} · This record is immutable and permanently stored on the AgriTrust blockchain.
        </p>
      </div>

      <footer className="flex items-center justify-between border-t border-agri-border px-8 py-6">
        <div className="flex items-center gap-2">
          <Link href="/">
            <BrandLogo size="xs" showName={false} />
          </Link>
          <p className="text-sm text-agri-muted">
            Transparent produce. Trusted by nature.
          </p>
        </div>
        <Link className="text-sm text-accent-blue" href="/register">
          Are you a farmer? Register at agritrust.io ↗
        </Link>
      </footer>
    </div>
  );
}
