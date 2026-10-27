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
import Image from "next/image";
import "./landing.css";

import BrandLogo from "@/components/brand/BrandLogo";
import LandingMobileMenu from "@/components/layout/LandingMobileMenu";

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


// Keep the existing destinations throughout this visual-only redesign.
const navigationItems = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For Farmers", href: "#for-farmers" },
  { label: "For Regulators", href: "#for-regulators" },
  { label: "Verify Produce", href: "/verify/AGT-0042" },
] as const;
export default function Home() {
  return (
    <main className="landing">
      <nav className="landing-nav landing-container" aria-label="Main navigation">
        <BrandLogo size="sm" textClassName="text-xl" />
        <div className="landing-nav-links">{navigationItems.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}</div>
        <Link className="landing-button landing-button-nav" href="/register">Get Started</Link>
        <LandingMobileMenu items={navigationItems} />
      </nav>
      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <h1 id="hero-heading"><span>Every harvest.</span><span className="landing-gradient-text">Verified on-chain.</span></h1>
            <p>AgriTrust gives farms, inspectors, regulators, and consumers one trusted source of truth for safe, traceable produce.</p>
            <div className="landing-actions">
              <Link className="landing-button landing-button-light" href="/register"><Sprout aria-hidden="true" />Register Your Farm</Link>
              <Link className="landing-button landing-button-outline" href="/verify/AGT-0042"><QrCode aria-hidden="true" />Scan a Product</Link>
            </div>
            <div className="landing-trust"><span><CheckCircle2 aria-hidden="true" />Tamper-proof records</span><span><ShieldCheck aria-hidden="true" />NAFDAC-ready</span><span><ChainLink aria-hidden="true" />Blockchain-anchored</span></div>
          </div>
          <div className="landing-network"><Image src="/landing/agritrust-africa-network.png" alt="AgriTrust illustration of Africa with country boundaries, connected verification nodes and blockchain record cards" width={1672} height={941} priority unoptimized /></div>
        </div>
        <figure className="landing-supply-chain">
          <Image src="/landing/supply-chain.webp" alt="Farm equipment, handling facilities, a delivery truck and a produce market connected by illuminated nodes" width={755} height={88} unoptimized />
          <figcaption>{flowSteps.map(({label}) => <span key={label}>{label}</span>)}</figcaption>
          <div className="landing-mobile-flow">{flowSteps.map(({label},index) => <div key={label}><Image src={"/landing/supply-step-"+index+".webp"} alt="" width={90} height={88} unoptimized /><span><small aria-hidden="true">{index+1}</small>{label}</span></div>)}</div>
        </figure>
      </section>
      <section id="how-it-works" className="landing-process" aria-labelledby="process-heading">
        <h2 id="process-heading">How it works</h2>
        <p className="landing-section-intro">From farm registration to market scan, every step is signed, timestamped, and visible.</p>
        <div className="landing-process-grid">{processCards.map(({number,title,copy}) => <article key={title} className="landing-process-card"><span className="landing-step">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>
      <section id="for-farmers" className="landing-farmers" aria-labelledby="farmer-heading">
        <div className="landing-farmer-copy">
          <p className="landing-eyebrow">BUILT FOR AFRICA</p>
          <h2 id="farmer-heading">Accessible to <span className="landing-green-text">every farmer</span></h2>
          <p className="landing-description">Transparent produce. Trusted by nature. A mobile-first platform connecting farms, inspectors, regulators, and consumers.</p>
          <div className="landing-feature-list">{features.map(({icon: Icon,title,copy}) => <article key={title} className="landing-feature-card"><span className="landing-feature-icon"><Icon aria-hidden="true" /></span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
        </div>
        <figure className="landing-phone"><Image src="/landing/agritrust-verification-phone.png" alt="Illustrative AgriTrust angled smartphone showing a produce verification journey with verified, traceability and on-chain badges" width={1254} height={1254} unoptimized /></figure>
      </section>
      <section className="landing-statistics" aria-label="Illustrative platform statistics">
        <div className="landing-stats-grid">{stats.map(({value,label},index) => <div key={label} className={"landing-stat landing-stat-"+index}><strong>{value}</strong><span>{label}</span></div>)}</div>
        <p>Illustrative figures · not live platform metrics</p>
      </section>
      <section id="for-regulators" className="landing-regulators" aria-labelledby="regulator-heading">
        <div><p className="landing-eyebrow">FOR REGULATORS</p><h2 id="regulator-heading">Government-grade<br />oversight</h2><p className="landing-description">Real-time visibility into compliance, biosafety status, and supply chain activity across regions.</p><Link className="landing-text-link" href="/onboarding">For Regulators <span aria-hidden="true">↗</span></Link></div>
        <figure className="landing-dashboard"><Image src="/landing/agritrust-regulator-dashboard.png" alt="Illustrative AgriTrust regulator dashboard with a Nigerian compliance map, batch volume chart, compliance ring and alerts table" width={1672} height={941} unoptimized /><figcaption>Illustrative dashboard preview · not live regulatory data</figcaption></figure>
      </section>
      <section className="landing-cta-section" aria-labelledby="cta-heading">
        <div className="landing-cta landing-container">
        <Image className="landing-cta-photo" src="/landing/farmer.webp" alt="Farmer holding freshly harvested vegetables in a field" width={290} height={192} unoptimized />
        <div className="landing-cta-content"><h2 id="cta-heading">Start tracing your produce today</h2><p>Create a trusted produce passport and make every handoff visible from farm to market.</p><div className="landing-actions"><Link className="landing-button landing-button-green" href="/register">Get Started Free</Link><Link className="landing-button landing-button-outline" href="/verify/AGT-0042">Verify a Product</Link></div></div>
        </div>
      </section>
      <footer className="landing-footer">
        <div className="landing-container landing-footer-top">
          <div><BrandLogo size="sm" textClassName="text-xl" /><p>Transparent produce.<br />Trusted by nature.</p></div>
          <div className="landing-footer-links"><div><a href="#how-it-works">How it works</a><Link href="/register">Farmers</Link></div><div><Link href="/onboarding">Regulators</Link><Link href="/verify/AGT-0042">Verify</Link></div><div><Link href="/login">Login</Link><Link href="/register">Get Started</Link></div><div><Link href="/help">Docs</Link></div></div>
        </div>
        <div className="landing-container landing-footer-bottom"><span>Every harvest. Every handoff. On-chain.</span><p>© 2026 AgriTrust. All rights reserved.</p></div>
      </footer>
    </main>
  );
}
