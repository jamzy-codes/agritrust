import {
  CheckCircle2,
  Globe,
  Link as ChainLink,
  MapPin,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sprout,
  Store,
  Truck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

import BrandLogo from "@/components/brand/BrandLogo";

const flowSteps = [
  { icon: Sprout, label: "Farm", color: "text-accent-green" },
  { icon: Warehouse, label: "Warehouse", color: "text-accent-blue" },
  { icon: ShieldCheck, label: "Inspect", color: "text-accent-blue" },
  { icon: Truck, label: "Distribute", color: "text-accent-amber" },
  { icon: Store, label: "Market", color: "text-accent-green" },
];

const processCards = [
  {
    number: "1",
    icon: Sprout,
    color: "text-accent-green",
    title: "Farm registers batch",
    copy: "Farmer records crop type, quantity, GMO declaration, and farming practices on-chain.",
  },
  {
    number: "2",
    icon: ShieldCheck,
    color: "text-accent-blue",
    title: "Inspector verifies",
    copy: "NAFDAC-certified inspector records biosafety findings and issues a certificate.",
  },
  {
    number: "3",
    icon: Truck,
    color: "text-accent-amber",
    title: "Supply chain recorded",
    copy: "Every custody handoff is logged with location, timestamp, and actor wallet address.",
  },
  {
    number: "4",
    icon: QrCode,
    color: "text-accent-purple",
    title: "Consumer scans QR",
    copy: "Anyone can scan a QR code to see the full verified produce passport — no login needed.",
  },
];

const features = [
  {
    icon: MapPin,
    color: "text-accent-green",
    bg: "bg-accent-green/20",
    title: "Works across Nigeria",
    copy: "Designed for all 36 states and FCT, from Lagos to Kano.",
  },
  {
    icon: Smartphone,
    color: "text-accent-blue",
    bg: "bg-accent-blue/20",
    title: "Mobile-first design",
    copy: "Optimised for the devices farmers actually use.",
  },
  {
    icon: Globe,
    color: "text-accent-purple",
    bg: "bg-accent-purple/20",
    title: "No wallet required for consumers",
    copy: "Public verify page works on any device with no crypto knowledge needed.",
  },
];

const stats = [
  { value: "12,400+", label: "Registered farmers", color: "text-accent-blue" },
  { value: "98.7%", label: "Compliance rate", color: "text-accent-green" },
  { value: "4.2M", label: "Batches traced", color: "text-accent-purple" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-agri-base text-agri-text">
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/5 border-white/5 bg-agri-base/90 px-8 py-4 backdrop-blur-sm">
        <BrandLogo size="md" textClassName="text-xl" />
        <div className="hidden items-center gap-6 md:flex">
          {[
            "How it works",
            "For Farmers",
            "For Regulators",
            "Verify Produce",
          ].map((item) => (
            <a key={item} className="text-sm text-agri-muted hover:text-agri-text" href="#how-it-works">
              {item}
            </a>
          ))}
          <Link
            className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue/90"
            href="/register"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-4xl overflow-hidden px-6 pb-24 pt-40 text-center">
        <div className="hero-gradient pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-150px w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-green/5 blur-3xl" />
        <h1
          className="relative text-5xl font-bold leading-tight text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          <span className="block">Every harvest.</span>
          <span className="block">
            Verified{" "}
            <span className="bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">
              on-chain.
            </span>
          </span>
        </h1>
        <p className="relative mx-auto mt-6 max-w-2xl text-lg text-agri-muted">
          AgriTrust gives farms, inspectors, regulators, and consumers one trusted source of truth for safe, traceable produce.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-4">
          <Link className="flex items-center gap-2 rounded-xl bg-accent-green px-6 py-3 font-semibold text-white transition-shadow hover:shadow-[0_0_24px_rgba(34,197,94,0.4)]" href="/register">
            <Sprout className="h-5 w-5" />
            Register Your Farm
          </Link>
          <Link className="flex items-center gap-2 rounded-xl border border-agri-border px-6 py-3 font-semibold text-agri-text transition-shadow hover:shadow-[0_0_24px_rgba(59,130,246,0.3)]" href="/verify/AGT-0042">
            <QrCode className="h-5 w-5" />
            Scan a Product
          </Link>
        </div>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-agri-border bg-agri-surface px-4 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-accent-green" /> Tamper-proof records
          </span>
          <span className="flex items-center gap-2 rounded-full border border-agri-border bg-agri-surface px-4 py-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-accent-blue" /> NAFDAC-ready
          </span>
          <span className="flex items-center gap-2 rounded-full border border-agri-border bg-agri-surface px-4 py-2 text-sm">
            <ChainLink className="h-4 w-4 text-accent-purple" /> Blockchain-anchored
          </span>
        </div>
      </section>

      <section className="mt-20 flex items-center justify-center gap-0 px-8">
        {flowSteps.map(({ icon: Icon, label, color }, index) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full border border-agri-border bg-agri-surface transition-all hover:scale-110 ${color === "text-accent-amber" ? "hover:glow-amber" : color === "text-accent-blue" ? "hover:glow-blue" : "hover:glow-green"}`}>
                <Icon className={`h-7 w-7 ${color}`} />
              </div>
              <span className="mt-1 text-xs text-agri-muted">{label}</span>
            </div>
            {index < flowSteps.length - 1 ? (
              <div className="w-12 self-center border-t-2 border-dashed border-accent-green/40 opacity-60" />
            ) : null}
          </div>
        ))}
      </section>

      <section id="how-it-works" className="mt-24 bg-agri-surface py-20">
        <h2
          className="mb-4 text-center text-3xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          How it works
        </h2>
        <p className="mb-16 text-center text-agri-muted">
          From farm registration to market scan, every step is signed, timestamped, and visible.
        </p>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-8 md:grid-cols-4">
          {processCards.map(({ number, icon: Icon, color, title, copy }) => (
            <article key={title} className="glass rounded-2xl border border-agri-border p-6 transition-all hover:-translate-y-1 hover:border-accent-blue/30">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue/20 text-sm font-bold text-accent-blue">
                {number}
              </div>
              <Icon className={`h-6 w-6 ${color}`} />
              <h3 className="mb-2 mt-3 font-semibold text-agri-text">{title}</h3>
              <p className="text-sm text-agri-muted">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-center gap-16 px-8 py-20 md:flex-row">
        <div className="flex-1">
          <h2
            className="mb-6 text-3xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Accessible to every farmer
          </h2>
          {features.map(({ icon: Icon, color, bg, title, copy }) => (
            <div key={title} className="mb-6 flex items-start gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <h3 className="font-bold text-agri-text">{title}</h3>
                <p className="text-sm text-agri-muted">{copy}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="glass w-72 shrink-0 rounded-3xl border-2 border-agri-border border-accent-green/20 bg-agri-surface p-5 shadow-[0_0_32px_rgba(34,197,94,0.15)]">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent-green" />
            <span className="text-xs font-bold text-accent-green">VERIFIED</span>
          </div>
          <h3 className="font-bold text-agri-text">Grade A Cocoa</h3>
          <p className="mb-4 text-sm text-agri-muted">Okafor Family Farm</p>
          <div className="flex items-center">
            <span className="h-4 w-4 rounded-full bg-accent-green" />
            <span className="h-px flex-1 bg-agri-border" />
            <span className="h-4 w-4 rounded-full bg-accent-green" />
            <span className="h-px flex-1 bg-agri-border" />
            <span className="h-4 w-4 rounded-full bg-accent-green" />
            <span className="h-px flex-1 bg-agri-border" />
            <span className="h-4 w-4 animate-pulse rounded-full bg-accent-amber" />
            <span className="h-px flex-1 bg-agri-border" />
            <span className="h-4 w-4 rounded-full bg-agri-muted" />
          </div>
          <p className="mt-3 font-mono text-xs text-accent-cyan">AGT-0042</p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-agri-raised py-12">
        <div className="hero-gradient pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex max-w-4xl flex-col justify-center gap-10 px-8 sm:flex-row sm:gap-24">
          {stats.map(({ value, label, color }) => (
            <div key={label} className="text-center">
              <div
                className={`bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent ${
                  color === "text-accent-green"
                    ? "from-accent-green to-accent-blue"
                    : color === "text-accent-purple"
                      ? "from-accent-purple to-accent-blue"
                      : "from-accent-blue to-accent-green"
                }`}
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                {value}
              </div>
              <p className="mt-1 text-sm text-agri-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-8 py-20">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-agri-border border-accent-green/20 bg-gradient-to-br from-accent-green/10 via-accent-blue/5 to-accent-purple/10 p-12 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.18),transparent_55%)]" />
          <h2
            className="relative mb-4 text-3xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Start tracing your produce today
          </h2>
          <p className="relative mb-8 text-agri-muted">
            Create a trusted produce passport and make every handoff visible from farm to market.
          </p>
          <div className="relative flex flex-wrap justify-center gap-4">
            <Link className="rounded-xl bg-accent-green px-8 py-3 font-semibold text-white transition-shadow hover:shadow-[0_0_24px_rgba(34,197,94,0.4)]" href="/register">
              Get Started Free
            </Link>
            <Link className="rounded-xl border border-agri-border px-8 py-3 font-semibold text-agri-text transition-shadow hover:shadow-[0_0_24px_rgba(59,130,246,0.3)]" href="/verify/AGT-0042">
              Verify a Product
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-agri-border bg-agri-base px-8 py-12">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
          <div>
            <BrandLogo size="md" textClassName="text-xl" />
            <p className="mt-2 text-sm text-agri-muted">Transparent produce. Trusted by nature.</p>
          </div>
          <div className="grid grid-cols-4 gap-10 text-sm text-agri-muted">
            <div className="flex flex-col gap-2">
              <a className="hover:text-agri-text" href="#how-it-works">How it works</a>
              <a className="hover:text-agri-text" href="/register">Farmers</a>
            </div>
            <div className="flex flex-col gap-2">
              <a className="hover:text-agri-text" href="/onboarding">Regulators</a>
              <Link className="hover:text-agri-text" href="/verify/AGT-0042">Verify</Link>
            </div>
            <div className="flex flex-col gap-2">
              <a className="hover:text-agri-text" href="/login">Login</a>
              <a className="hover:text-agri-text" href="/register">Get Started</a>
            </div>
            <div className="flex flex-col gap-2">
              <Link className="hover:text-agri-text" href="/help">Docs</Link>
            </div>
          </div>
          <p className="text-xs text-agri-muted">© 2026 AgriTrust. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
