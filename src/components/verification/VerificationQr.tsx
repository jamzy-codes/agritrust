"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Printer,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  buildVerificationUrl,
  isLocalVerificationUrl,
  resolvePublicAppOrigin,
} from "@/lib/verify-links";

interface VerificationQrProps {
  batchId: string;
  compact?: boolean;
  showOpenAction?: boolean;
  showPrintAction?: boolean;
  size?: number;
}

type ActionStatus = "idle" | "copied" | "copy-error";

const subscribeToOrigin = () => () => undefined;
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => undefined;

export default function VerificationQr({
  batchId,
  compact = false,
  showOpenAction = false,
  showPrintAction = false,
  size = compact ? 64 : 144,
}: VerificationQrProps) {
  const runtimeOrigin = useSyncExternalStore(
    subscribeToOrigin,
    getBrowserOrigin,
    getServerOrigin,
  );
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");

  const originResolution = useMemo(
    () => resolvePublicAppOrigin(runtimeOrigin),
    [runtimeOrigin],
  );
  const verificationUrl = originResolution.origin
    ? buildVerificationUrl(originResolution.origin, batchId)
    : null;
  const isLocal = verificationUrl
    ? isLocalVerificationUrl(verificationUrl)
    : false;

  useEffect(() => {
    let cancelled = false;

    if (!verificationUrl) return;

    void QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "H",
      margin: 4,
      width: 768,
      type: "image/png",
      color: { dark: "#07140bff", light: "#ffffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setGenerationError(null);
          setQrDataUrl(dataUrl);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("QR code generation failed", {
          batchId,
          message: error instanceof Error ? error.message : String(error),
        });
        setGenerationError(
          "The QR code could not be generated. Please reload and try again.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [batchId, verificationUrl]);

  async function copyLink() {
    if (!verificationUrl) return;
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setActionStatus("copied");
      window.setTimeout(() => setActionStatus("idle"), 2000);
    } catch {
      setActionStatus("copy-error");
    }
  }

  function downloadQrCode() {
    if (!qrDataUrl || isLocal) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `agritrust-${batchId}-qr.png`;
    link.click();
  }

  const buttonClassName =
    "flex items-center justify-center gap-1.5 rounded-lg border border-agri-border px-3 py-2 text-xs text-agri-text transition-colors hover:bg-agri-raised disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center justify-end gap-2"
          : "text-center"
      }
    >
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-agri-border bg-white ${
          compact ? "p-1" : "mx-auto mb-3 p-2"
        }`}
        style={{ width: size, height: size }}
      >
        {qrDataUrl ? (
          <Image
            alt={`QR code linking to public verification for ${batchId}`}
            className="h-full w-full"
            height={size}
            src={qrDataUrl}
            unoptimized
            width={size}
          />
        ) : generationError ? (
          <span className="px-2 text-center text-[10px] leading-tight text-accent-red">
            Unavailable
          </span>
        ) : (
          <Loader2
            aria-label="Generating QR code"
            className="h-5 w-5 animate-spin text-agri-muted"
          />
        )}
      </div>

      <div
        className={
          compact
            ? "flex flex-wrap justify-end gap-2"
            : "flex flex-col gap-2"
        }
      >
        <button
          className={buttonClassName}
          disabled={!verificationUrl}
          onClick={copyLink}
          type="button"
        >
          {actionStatus === "copied" ? (
            <Check className="h-4 w-4 text-accent-green" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {actionStatus === "copied" ? "Copied" : "Copy link"}
        </button>
        <button
          className={buttonClassName}
          disabled={!qrDataUrl || isLocal}
          onClick={downloadQrCode}
          title={
            isLocal
              ? "Set NEXT_PUBLIC_APP_URL to a public or phone-reachable URL before downloading."
              : undefined
          }
          type="button"
        >
          <Download className="h-4 w-4" />
          Download QR
        </button>
        {showOpenAction && verificationUrl ? (
          <Link
            className={buttonClassName}
            href={verificationUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </Link>
        ) : null}
        {showPrintAction ? (
          <button
            className={`${buttonClassName} print:hidden`}
            onClick={() => window.print()}
            type="button"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        ) : null}
      </div>

      {compact && isLocal ? (
        <span
          className="rounded-md border border-accent-amber/30 bg-accent-amber/10 px-2 py-1 text-[10px] text-accent-amber"
          title="Set NEXT_PUBLIC_APP_URL before sharing this QR with another device."
        >
          Local-only URL
        </span>
      ) : null}
      {!compact && verificationUrl ? (
        <p className="mt-3 break-all font-mono text-[10px] text-agri-muted">
          {verificationUrl}
        </p>
      ) : null}
      {!compact && isLocal ? (
        <p className="mt-2 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-3 py-2 text-left text-[11px] text-accent-amber">
          This QR uses a local-only address. Set NEXT_PUBLIC_APP_URL to an
          HTTPS or phone-reachable URL before printing or sharing it with
          another device.
        </p>
      ) : null}
      {!compact && originResolution.configurationError ? (
        <p className="mt-2 text-left text-[11px] text-accent-red">
          {originResolution.configurationError}
        </p>
      ) : null}
      {!compact && actionStatus === "copy-error" ? (
        <p className="mt-2 text-left text-[11px] text-accent-red">
          The link could not be copied. Open it and copy the browser address
          instead.
        </p>
      ) : null}
      {!compact && generationError ? (
        <p className="mt-2 text-left text-[11px] text-accent-red">
          {generationError}
        </p>
      ) : null}
    </div>
  );
}