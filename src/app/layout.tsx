import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import Link from "next/link";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "PriceDrop Buddy™ – Get your money back when prices drop",
  description:
    "Scan any receipt from any big store and never miss a price-drop refund deadline, for free.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          {children}
        </main>
        <footer className="border-t-2 border-ink/10 px-4 py-8 text-center text-sm text-ink-soft">
          <p>© 2026 PriceDrop Buddy™. All rights reserved.</p>
          <p className="mt-1">
            Store policies change. Check with the store before you claim.
          </p>
          <p className="mt-3">
            <Link href="/privacy" className="font-semibold text-ink underline">
              Privacy
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
