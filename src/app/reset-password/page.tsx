"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import BrandLogo from "@/components/brand/BrandLogo";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmation) return setError("The passwords do not match.");

    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSaving(false);
    if (updateError) return setError(updateError.message);
    router.replace("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-agri-base px-4 py-10">
      <section className="glass relative z-10 w-full max-w-md rounded-2xl border border-agri-border bg-agri-surface p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
        <div className="mb-6 flex justify-center"><BrandLogo size="lg" /></div>
        <h1 className="text-center text-2xl font-bold text-agri-text" style={{ fontFamily: "var(--font-outfit)" }}>Set a new password</h1>
        <p className="mb-6 mt-1 text-center text-sm text-agri-muted">Choose a secure password for your AgriTrust account.</p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-agri-muted">New password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
              <input className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 pl-9 pr-10 text-sm text-agri-text focus:border-agri-border-focus focus:outline-none" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-agri-muted hover:text-agri-text" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-agri-muted">Confirm new password</span>
            <input className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 text-sm text-agri-text focus:border-agri-border-focus focus:outline-none" type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required />
          </label>
          {error ? <p className="text-sm text-accent-red" role="alert">{error}</p> : null}
          <button className="w-full rounded-lg bg-accent-blue py-2.5 font-medium text-white hover:bg-accent-blue/90 disabled:opacity-60" type="submit" disabled={isSaving}>{isSaving ? "Saving password..." : "Update password"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-agri-muted"><Link className="text-accent-green" href="/login">Return to sign in</Link></p>
      </section>
    </main>
  );
}
