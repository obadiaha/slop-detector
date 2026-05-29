"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/campaigns", label: "Campaigns", icon: "✦" },
  { href: "/targets", label: "Targets", icon: "◎" },
  { href: "/senders", label: "Senders", icon: "✈" },
  { href: "/templates", label: "Templates", icon: "✎" },
  { href: "/suppression", label: "Suppression", icon: "⊘" },
  { href: "/settings", label: "API & Settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 hidden md:flex md:flex-col">
      <Link href="/" className="px-2 mb-8 flex items-center gap-2">
        <span className="text-2xl">📨</span>
        <span className="text-lg font-bold gradient-text">InstaReach</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[var(--color-accent-muted)] text-[var(--color-foreground)] font-medium"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
              }`}
            >
              <span className="w-4 text-center opacity-80">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 pt-6 text-xs text-[var(--color-muted)]">
        <p className="leading-relaxed">
          Simulation driver active. Delivery is mocked end-to-end — see the README
          for wiring a production driver.
        </p>
      </div>
    </aside>
  );
}
