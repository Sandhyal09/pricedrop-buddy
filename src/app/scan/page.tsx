import type { Metadata } from "next";
import { ReceiptScanner } from "@/components/receipt-scanner";
import { SetupNotice } from "@/components/notices";

export const metadata: Metadata = { title: "Scan a receipt – PriceDrop Buddy™" };

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <SetupNotice />
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        Add from a receipt
      </h1>
      <p className="mt-2 mb-6 text-ink-soft">
        Works with Target, Best Buy, Home Depot and Costco receipts, and most
        online order confirmations.
      </p>
      <ReceiptScanner />
    </div>
  );
}
