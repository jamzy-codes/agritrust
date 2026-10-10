import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Leaf,
  Link as LinkIcon,
  MapPin,
  QrCode,
  Scale,
  Share2,
  ShieldCheck,
  Sprout,
  Store,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { CHAIN_STAGES, TX_HASHES } from "@/lib/mockData";
import type { ChainStage } from "@/types";

const stageIcons: Record<ChainStage["stage"], LucideIcon> = {
  FARM: Sprout,
  WAREHOUSE: Warehouse,
  INSPECTION: ShieldCheck,
  DISTRIBUTION: Truck,
  MARKET: Store,
};

const stageNames: Record<ChainStage["stage"], string> = {
  FARM: "Farm",
  WAREHOUSE: "Warehouse",
  INSPECTION: "Inspection",
  DISTRIBUTION: "Distribution",
  MARKET: "Market",
};

function truncateHash(hash: string, chars = 20) {
  return `${hash.slice(0, chars)}...`;
}

function dateClassName(status: ChainStage["status"]) {
  if (status === "COMPLETE") return "text-accent-green";
  if (status === "CURRENT") return "text-accent-amber";
  return "text-agri-muted";
}

export default async function TraceBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;

  return (
    <div className="pb-8">
      <nav className="mb-6 flex items-center gap-2 px-8 pt-8 text-sm">
        <Link className="text-agri-muted hover:text-agri-text" href="/dashboard/trace">
          Trace
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-agri-muted" />
        <span className="font-medium text-agri-text">{batchId}</span>
      </nav>

      <header className="mb-6 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <h1
            className="text-2xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Batch {batchId}
          </h1>
          <span className="rounded-full bg-accent-green/20 px-3 py-1.5 text-xs font-bold text-accent-green">
            CERTIFIED
          </span>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-agri-border px-4 py-2 text-sm text-agri-muted" type="button">
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-accent-purple px-4 py-2 text-sm font-medium text-white" type="button">
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>
      </header>

      <section className="mx-8 mb-6 grid grid-cols-1 gap-8 rounded-xl glass p-6 lg:grid-cols-2">
        <div>
          {[
            { icon: Sprout, label: "Crop type", value: "Grade A Cocoa" },
            { icon: Scale, label: "Quantity", value: "500 kg" },
            { icon: MapPin, label: "Farm origin", value: "Okafor Family Farm, Rivers State" },
            { icon: Calendar, label: "Registered", value: "June 14, 2026" },
            { icon: Leaf, label: "Seed source", value: "NASC Certified OC-7" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 border-b border-agri-border py-2 last:border-0">
              <Icon className="h-4 w-4 text-agri-muted" />
              <span className="w-24 text-xs text-agri-muted">{label}</span>
              <span className="text-sm font-medium text-agri-text">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex h-full flex-col items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-agri-border bg-agri-raised">
            <QrCode className="h-10 w-10 text-agri-muted" />
          </div>
          <p className="mt-2 text-center text-xs text-agri-muted">Scan for public verify page</p>
          <p className="mt-1 text-center font-mono text-xs text-accent-cyan">
            {truncateHash(TX_HASHES.registration)}
          </p>
        </div>
      </section>

      <section className="relative mx-8 mb-6 rounded-xl glass p-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-accent-green/3 to-transparent" />
        <h2 className="relative z-10 mb-8 text-base font-semibold text-agri-text">Supply chain timeline</h2>
        <div className="relative flex items-start justify-between">
          <div className="absolute left-0 right-0 top-10 z-0 h-0.5">
            <div className="absolute left-[10%] top-0 h-0.5 w-[20%] bg-accent-green" />
            <div className="absolute left-[30%] top-0 h-0.5 w-[20%] bg-accent-green" />
            <div className="absolute left-[50%] top-0 h-0.5 w-[20%] bg-linear-to-r from-accent-green to-accent-amber" />
            <div
              className="absolute left-[70%] top-0 h-0.5 w-[20%]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, #2a2a3e 0 8px, transparent 8px 14px)",
              }}
            />
          </div>

          {CHAIN_STAGES.map((stage, index) => {
            const Icon = stageIcons[stage.stage];
            const isComplete = stage.status === "COMPLETE";
            const isCurrent = stage.status === "CURRENT";

            return (
              <article key={stage.stage} className="relative z-10 flex w-1/5 flex-col items-center px-2">
                <div
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 ${
                    isComplete
                      ? "border-accent-green bg-accent-green/20 glow-green"
                      : isCurrent
                        ? "animate-pulse border-accent-amber bg-accent-amber/20 glow-amber shadow-[0_0_32px_rgba(245,158,11,0.4)]"
                        : "border-agri-border bg-agri-raised"
                  }`}
                >
                  <Icon
                    className={`h-7 w-7 ${
                      isComplete ? "text-accent-green" : isCurrent ? "text-accent-amber" : "text-agri-muted"
                    }`}
                  />
                  {isComplete ? (
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent-green">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  ) : null}
                  {isCurrent ? (
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-accent-amber">
                      <Clock className="h-3 w-3 text-white" />
                    </span>
                  ) : null}
                  {!isComplete && !isCurrent ? (
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-agri-border bg-agri-raised text-xs text-agri-muted">
                      {index + 1}
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-center text-sm font-bold text-agri-text">{stageNames[stage.stage]}</p>
                <p className={`mt-1 text-center font-mono text-xs ${dateClassName(stage.status)}`}>{stage.date}</p>

                <div className="mt-3 w-full space-y-1 rounded-lg bg-agri-raised p-3 text-xs">
                  {Object.entries(stage.details).map(([key, value]) => (
                    <div key={key}>
                      <p className="capitalize text-agri-muted">{key}</p>
                      <p className="font-medium text-agri-text">{value}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl glass p-6">
          <h3 className="mb-4 text-sm font-semibold text-agri-text">Blockchain anchors</h3>
          {[
            ["Registration TX", TX_HASHES.registration],
            ["Inspection TX", TX_HASHES.inspection],
            ["Certificate TX", TX_HASHES.certificate],
          ].map(([label, hash]) => (
            <div key={label} className="flex items-start gap-3 border-b border-agri-border py-3 last:border-0">
              <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple" />
              <div>
                <p className="text-xs font-bold text-agri-text">{label}</p>
                <p className="break-all font-mono text-xs text-accent-cyan">{hash}</p>
                <a className="mt-1 block text-xs text-accent-blue" href="#">
                  View on explorer ↗
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl glass p-6">
          <h3 className="mb-4 text-sm font-semibold text-agri-text">Compliance summary</h3>
          {[
            { icon: CheckCircle2, color: "text-accent-green", text: "GMO-free status: Confirmed" },
            { icon: CheckCircle2, color: "text-accent-green", text: "Biosafety grade: A+" },
            { icon: CheckCircle2, color: "text-accent-green", text: "NAFDAC compliant: Yes" },
            { icon: Clock, color: "text-accent-amber", text: "Market delivery: Pending" },
          ].map(({ icon: Icon, color, text }) => (
            <div key={text} className="flex items-center gap-3 border-b border-agri-border py-3 last:border-0">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className={`text-sm ${color === "text-accent-amber" ? "text-accent-amber" : "text-agri-text"}`}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}