"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, ShieldCheck } from "lucide-react";

import BrandLogo from "@/components/brand/BrandLogo";
import {
  batchIdValidationMessage,
  normalizeBatchId,
} from "@/lib/batch-id";

export default function VerifyProductPage() {
  const router = useRouter();
  const [batchId, setBatchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = batchIdValidationMessage(batchId);
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalizedBatchId = normalizeBatchId(batchId);
    setBatchId(normalizedBatchId);
    setError(null);
    startTransition(() => {
      router.push(`/verify/${encodeURIComponent(normalizedBatchId)}`);
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-agri-base">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(34,197,94,0.13),transparent_38%),radial-gradient(circle_at_85%_70%,rgba(59,130,246,0.08),transparent_32%)]" />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-agri-border px-4 py-4 sm:px-8">
        <Link className="inline-flex min-h-11 items-center" href="/">
          <BrandLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2 text-xs text-agri-muted sm:text-sm">
          <ShieldCheck className="h-4 w-4 text-accent-green" />
          Public Verification Portal
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-77px)] max-w-5xl items-center justify-center px-4 py-12 sm:px-8 sm:py-16">
        <div className="w-full max-w-xl rounded-2xl border border-agri-border bg-agri-surface/95 p-5 shadow-[0_32px_80px_rgba(0,0,0,0.38)] backdrop-blur sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-green/30 bg-accent-green/10 text-accent-green shadow-[0_0_35px_rgba(34,197,94,0.18)]">
            <Search className="h-7 w-7" aria-hidden="true" />
          </div>

          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-green">
              Traceable produce
            </p>
            <h1 className="mt-2 text-3xl font-bold text-agri-text sm:text-4xl">
              Verify Your Produce
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-agri-muted sm:text-base">
              Enter the Batch ID shown on the produce label or passport to view its verified origin, inspection, certification, and supply-chain history.
            </p>
          </div>

          <form className="mt-8" onSubmit={handleSubmit} noValidate>
            <label className="block" htmlFor="verification-batch-id">
              <span className="mb-2 block text-sm font-semibold text-agri-text">Batch ID</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
                <input
                  id="verification-batch-id"
                  className="min-h-12 w-full rounded-xl border border-agri-border bg-agri-raised py-3 pl-10 pr-4 font-mono text-base uppercase text-agri-text placeholder:font-sans placeholder:normal-case placeholder:text-agri-muted focus:border-accent-green focus:outline-none focus:ring-4 focus:ring-accent-green/10"
                  value={batchId}
                  onChange={(event) => {
                    setBatchId(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="AGT-1234"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={32}
                  aria-describedby={error ? "batch-id-error" : "batch-id-help"}
                  aria-invalid={Boolean(error)}
                  disabled={isNavigating}
                />
              </div>
            </label>

            {error ? (
              <p id="batch-id-error" className="mt-2 text-sm text-accent-red" role="alert">
                {error}
              </p>
            ) : (
              <p id="batch-id-help" className="mt-2 text-xs text-agri-muted">
                Batch IDs use the format AGT-1234. Letter case and surrounding spaces are normalized automatically.
              </p>
            )}

            <button
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-green px-5 py-3 text-sm font-bold text-[#07140b] transition-colors hover:bg-accent-green/90 disabled:cursor-wait disabled:opacity-70"
              type="submit"
              disabled={isNavigating}
            >
              {isNavigating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Opening produce passport...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Verify Product
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-agri-border pt-5 text-center">
            <Link className="inline-flex min-h-10 items-center gap-2 text-sm text-agri-muted hover:text-agri-text" href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to AgriTrust
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
