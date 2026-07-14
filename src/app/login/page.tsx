"use client";

import { Eye, EyeOff, Lock, Mail, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

import BrandLogo from "@/components/brand/BrandLogo";
import { supabase } from "@/lib/supabase";

interface LoginForm {
  email: string;
  password: string;
}


export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showResetMessage, setShowResetMessage] = useState(false);
   const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();

  function updateField(field: keyof LoginForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleLogin() {
    setError(null);

    if (!form.email || !form.password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
    }
  } 
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-agri-base px-4 py-10">
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-accent-green/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-accent-blue/8 blur-3xl" />

      <section className="glass relative z-10 w-full max-w-md rounded-2xl border border-agri-border border-t border-t-accent-blue/20 bg-agri-surface p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
        <div className="mb-6 flex justify-center">
          <BrandLogo size="lg" />
        </div>

        <h2
          className="text-center text-2xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Welcome back
        </h2>

        <p className="mb-6 mt-1 text-center text-sm text-agri-muted">
          Sign in to continue tracing verified produce.
        </p>

        <form className="flex flex-col gap-4"
           onSubmit={(event)=> {
             event.preventDefault();
               handleLogin();
           }}
            >
          <label className="block">
            <span className="mb-1 block text-sm text-agri-muted">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
              <input
                className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 pl-9 text-sm text-agri-text placeholder:text-agri-muted transition-colors focus:border-agri-border-focus focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                placeholder="amara@farmco.ng"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-agri-muted">Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agri-muted" />
              <input
                className="w-full rounded-lg border border-agri-border bg-agri-raised px-4 py-2.5 pl-9 pr-10 text-sm text-agri-text placeholder:text-agri-muted transition-colors focus:border-agri-border-focus focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-agri-muted hover:text-agri-text"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-1 flex justify-end">
              <button
                className="text-xs text-accent-green"
                type="button"
                onClick={() => setShowResetMessage(true)}
              >
                Forgot password?
              </button>
            </div>
            {showResetMessage ? (
              <p className="mt-1 text-xs text-agri-muted">
                Password reset coming soon
              </p>
            ) : null}
          </label>

          {error ? (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-lg bg-accent-blue py-2.5 font-medium text-white transition-shadow hover:bg-accent-blue/90 hover:shadow-[0_0_24px_rgba(59,130,246,0.4)]"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-agri-border" />
          <span className="text-xs text-agri-muted">OR</span>
          <div className="h-px flex-1 bg-agri-border" />
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-agri-border py-2.5 text-sm font-medium text-agri-text hover:bg-agri-raised"
          type="button"
         onClick={() => {
            if (isConnected) return;
            openConnectModal?.();
          }}
        >
          <Wallet className="h-4 w-4" />
         {isConnected && address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "Connect Web3 Wallet"}
        </button>

        <p className="mt-4 text-center text-sm text-agri-muted">
          New to AgriTrust?{" "}
          <Link className="text-accent-green" href="/register">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
