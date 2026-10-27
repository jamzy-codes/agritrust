"use client";

import Link from "next/link";
import { useRef } from "react";

interface NavigationItem {
  label: string;
  href: string;
}

export default function LandingMobileMenu({ items }: { items: readonly NavigationItem[] }) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    menuRef.current?.removeAttribute("open");
  }

  return (
    <details
      ref={menuRef}
      className="landing-mobile-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          closeMenu();
          menuRef.current?.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label="Toggle navigation">
        <span className="landing-menu-bars" aria-hidden="true" />
        <span>Menu</span>
      </summary>
      <div className="landing-mobile-links">
        {items.map((item) => (
          <a key={item.label} href={item.href} onClick={closeMenu}>{item.label}</a>
        ))}
        <Link href="/register" onClick={closeMenu}>Get Started</Link>
      </div>
    </details>
  );
}
