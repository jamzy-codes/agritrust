"use client";

import {
  BookOpen,
  ChevronDown,
  Code2,
  FileText,
  Globe,
  HelpCircle,
  Mail,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import BrandLogo from "@/components/brand/BrandLogo";

const faqs = [
  {
    question: "How do I register a produce batch?",
    answer:
      "Go to Register in the sidebar and fill in your batch details including crop type, quantity, seed variety, and GMO declaration. Once submitted, your batch receives an on-chain ID and QR code.",
  },
  {
    question: "What is a biosafety certificate?",
    answer:
      "A biosafety certificate is issued by a NAFDAC-certified inspector after verifying your produce meets safety standards. It is permanently recorded on the AgriTrust blockchain.",
  },
  {
    question: "How can consumers verify my produce?",
    answer:
      "Each certified batch has a unique QR code. Consumers scan it to view the full produce passport - farm origin, inspection results, and supply chain journey - with no login required.",
  },
  {
    question: "What roles are available on AgriTrust?",
    answer:
      "AgriTrust supports four roles: Farmer (registers batches), Inspector (verifies biosafety), Distributor (records handoffs), and Regulator (monitors network compliance).",
  },
  {
    question: "Is my data secure on the blockchain?",
    answer:
      "Yes. All records are stored on the blockchain and are immutable - they cannot be edited or deleted once submitted. Only the wallet that registered a batch can initiate updates.",
  },
  {
    question: "How do I connect my Web3 wallet?",
    answer:
      "On the login or register page, click 'Connect Web3 Wallet'. AgriTrust supports MetaMask and other WalletConnect-compatible wallets.",
  },
];

const contactRows = [
  {
    icon: Mail,
    iconClassName: "text-accent-blue",
    label: "Email",
    value: "support@agritrust.io",
  },
  {
    icon: MessageSquare,
    iconClassName: "text-accent-green",
    label: "Live Chat",
    value: "Available Mon-Fri, 9am-5pm WAT",
  },
  {
    icon: Globe,
    iconClassName: "text-accent-purple",
    label: "Community",
    value: "Join our Telegram community",
  },
];

const resources = [
  { icon: FileText, label: "Documentation", href: "/help" },
  { icon: BookOpen, label: "Farmer's Guide", href: "/help" },
  { icon: Code2, label: "API Reference", href: "/help" },
  { icon: ShieldCheck, label: "Compliance Standards", href: "/help" },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="min-h-screen bg-agri-base">
      <header className="flex items-center justify-between border-b border-agri-border px-8 py-4">
        <Link href="/">
          <BrandLogo size="sm" />
        </Link>
        <Link className="text-sm text-accent-blue" href="/dashboard">
          Go to Dashboard -&gt;
        </Link>
      </header>

      <section className="px-8 py-16 text-center">
        <HelpCircle className="mx-auto mb-4 h-12 w-12 text-accent-blue" />
        <h1
          className="mb-3 text-4xl font-bold text-agri-text"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Help & Support
        </h1>
        <p className="mx-auto max-w-xl text-lg text-agri-muted">
          Everything you need to get the most out of AgriTrust.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-8 pb-16 lg:grid-cols-[1fr_340px]">
        <div>
          <h2
            className="mb-6 text-xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Frequently Asked Questions
          </h2>

          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <div
                key={faq.question}
                className="mb-3 overflow-hidden rounded-xl border border-agri-border bg-agri-surface"
              >
                <button
                  className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors hover:bg-agri-raised"
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                >
                  <p className="text-sm font-semibold text-agri-text">
                    {faq.question}
                  </p>
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 text-agri-muted transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-agri-border px-5 py-4">
                    <p className="text-sm text-agri-muted">{faq.answer}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <aside>
          <h2
            className="mb-4 text-xl font-bold text-agri-text"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Get in Touch
          </h2>

          <div className="mb-4 rounded-xl border border-agri-border bg-agri-surface p-5">
            {contactRows.map(({ icon: Icon, iconClassName, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-3 border-b border-agri-border py-3 last:border-0"
              >
                <Icon className={`h-4 w-4 ${iconClassName}`} />
                <div>
                  <p className="text-xs text-agri-muted">{label}</p>
                  <p className="text-sm text-agri-text">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-agri-border bg-agri-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-agri-text">
              Resources
            </h3>
            {resources.map(({ icon: Icon, label, href }) => (
              <Link
                key={label}
                className="flex cursor-pointer items-center gap-3 rounded-lg border-b border-agri-border px-2 py-2.5 text-sm text-accent-blue transition-colors last:border-0 hover:bg-agri-raised"
                href={href}
              >
                <Icon className="h-3.5 w-3.5 text-agri-muted" />
                {label}
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <footer className="flex items-center justify-between border-t border-agri-border px-8 py-6">
        <p className="text-sm text-agri-muted">
          © 2026 AgriTrust. All Rights Reserved. Team Innovaro
        </p>
        <Link
          className="text-sm text-agri-muted hover:text-agri-text"
          href="/"
        >
          &lt;- Back to home
        </Link>
      </footer>
    </main>
  );
}
