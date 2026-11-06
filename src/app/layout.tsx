import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "PriceDrop Buddy™ – Never miss a price-drop refund",
  description:
    "Scan any receipt from any big store and never miss a price-drop refund deadline, for free.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-neutral-200 py-6 text-center text-sm text-neutral-500">
          <p>
            © 2026 PriceDrop Buddy™. All rights reserved. ·{" "}
            <Link href="/" className="underline">
              Home
            </Link>
          </p>
          <p className="mt-1">
            Store policies change. Always confirm with the store before claiming.
          </p>
        </footer>
      </body>
    </html>
  );
}
