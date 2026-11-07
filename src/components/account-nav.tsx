"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Zm4 4h4",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z",
  download: "M12 4v11m-5-5 5 5 5-5M5 20h14",
  trash: "M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13",
} as const;

const ITEMS: { href: string; label: string; icon: keyof typeof ICONS; danger?: boolean }[] = [
  { href: "/account", label: "Your details", icon: "user" },
  { href: "/account/notifications", label: "Email alerts", icon: "bell" },
  { href: "/account/password", label: "Password", icon: "lock" },
  { href: "/account/data", label: "Your data", icon: "download" },
  { href: "/account/delete", label: "Delete account", icon: "trash", danger: true },
];

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account settings">
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? item.danger
                      ? "border-markdown bg-markdown text-white"
                      : "border-ink bg-ink text-paper shadow-[3px_3px_0_var(--color-sticker)]"
                    : item.danger
                      ? "border-transparent text-markdown hover:border-markdown hover:bg-markdown-soft"
                      : "border-transparent text-ink hover:border-ink hover:bg-sticker-soft"
                } ${item.danger ? "md:mt-4" : ""}`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
