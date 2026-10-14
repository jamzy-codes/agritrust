"use client";

import Link from "next/link";
import { useRef } from "react";

export default function LandingMobileMenu({ items }: { items: readonly string[] }) {
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
          <a key={item} href="#how-it-works" onClick={closeMenu}>{item}</a>
        ))}
        <Link href="/register" onClick={closeMenu}>Get Started</Link>
      </div>
    </details>
  );
}
