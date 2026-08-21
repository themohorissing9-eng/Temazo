"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Canciones", href: "", exact: true },
  { label: "Ranking", href: "/ranking", exact: false },
  { label: "Integrantes", href: "/members", exact: false },
];

export function GroupNav({ groupId }: { groupId: number }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;

  return (
    <nav className="mt-5 flex gap-1 border-b border-white/10">
      {tabs.map((tab) => {
        const href = tab.exact ? base : `${base}${tab.href}`;
        const active = tab.exact
          ? pathname === href
          : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "border-orange-400 text-orange-300"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
