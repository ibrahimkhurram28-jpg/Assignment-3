"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const PRIMARY_LINKS = [
  { href: "/", label: "Home" },
  { href: "/wordle", label: "Wordle" },
  { href: "/wordsearch", label: "Word Search" },
  { href: "/word-lists", label: "Word Lists" },
  { href: "/activities", label: "Activities" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reports", label: "Reports" },
];

const MENU_LINKS = [
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg font-mono-phoneme text-sm"
            style={{ background: "var(--color-primary)", color: "var(--color-surface)" }}
            aria-hidden="true"
          >
            /ə/
          </span>
          Phoneme Builder
        </Link>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-md text-sm font-semibold transition-colors"
              style={{
                color: pathname === link.href ? "var(--color-primary)" : "var(--color-ink)",
                background: pathname === link.href ? "var(--color-success-bg)" : "transparent",
              }}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="relative">
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={open}
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
            className="btn btn-outline flex items-center gap-2"
          >
            <span aria-hidden="true">☰</span>
            <span className="hidden sm:inline">Menu</span>
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 card p-2 shadow-lg"
              onMouseLeave={() => setOpen(false)}
            >
              <div className="lg:hidden flex flex-col mb-1 pb-1 border-b" style={{ borderColor: "var(--color-border)" }}>
                {PRIMARY_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-black/5"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              {MENU_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-black/5"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
