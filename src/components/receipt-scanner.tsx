"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import {
  readReceipt,
  saveScannedItems,
  type SaveState,
} from "@/app/scan/actions";
import type { ParsedReceipt } from "@/lib/receipt-parser";
import { STORES, todayString } from "@/lib/stores";

const MAX_BYTES = 1024 * 1024;
const TARGET_BYTES = 950 * 1024;

type Row = { id: number; keep: boolean; name: string; sku: string; price: string };

/** Shrinks a photo to a JPEG under ~950 KB so the free reader accepts it. */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  let scale = Math.min(1, 2000 / longest);

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", attempt < 3 ? 0.85 : 0.7),
    );
    if (blob && blob.size <= TARGET_BYTES) return blob;
    scale *= 0.8;
  }
  throw new Error("too-big");
}

export function ReceiptScanner() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"pick" | "reading" | "review">("pick");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setStage("reading");
    try {
      let upload: Blob = file;
      if (file.type === "application/pdf") {
        if (file.size > MAX_BYTES) {
          throw new Error("That PDF is over 1 MB. Try a 1-page PDF or a photo.");
        }
      } else if (file.type.startsWith("image/")) {
        try {
          upload = await shrinkImage(file);
        } catch {
          throw new Error(
            "This photo format couldn't be opened. Take the photo again with your camera, or use a JPG or PNG.",
          );
        }
      } else {
        throw new Error("Use a photo (JPG or PNG) or a PDF of your receipt.");
      }

      const fd = new FormData();
      fd.append(
        "receipt",
        new File([upload], file.type === "application/pdf" ? "receipt.pdf" : "receipt.jpg", {
          type: file.type === "application/pdf" ? "application/pdf" : "image/jpeg",
        }),
      );
      const result = await readReceipt(fd);
      if (!result.ok) throw new Error(result.error);

      setReceipt(result.receipt);
      setRows(
        result.receipt.items.map((item, i) => ({
          id: i,
          keep: true,
          name: item.name,
          sku: item.sku,
          price: item.price.toFixed(2),
        })),
      );
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setStage("pick");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (stage === "review" && receipt) {
    return (
      <ReviewForm
        receipt={receipt}
        rows={rows}
        setRows={setRows}
        onStartOver={() => {
          setReceipt(null);
          setRows([]);
          setStage("pick");
        }}
      />
    );
  }

  return (
    <div className="receipt p-6 sm:p-8">
      {error && (
        <p role="alert" className="mb-5 rounded-lg border-2 border-markdown bg-markdown-soft px-4 py-3 text-sm font-medium">
          {error}
        </p>
      )}
      {stage === "reading" ? (
        <div className="py-10 text-center" role="status" aria-live="polite">
          <p className="font-display text-2xl font-extrabold">Reading your receipt…</p>
          <p className="mt-2 text-ink-soft">This usually takes 5–15 seconds.</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold">Scan a receipt</p>
          <p className="mx-auto mt-2 max-w-md text-ink-soft">
            Lay the receipt flat in good light, with the whole thing in the
            photo. Online order? Upload a screenshot or PDF of the
            confirmation.
          </p>
          <label className="btn mt-6 cursor-pointer px-6 py-3 text-lg">
            Take or choose a photo
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          <p className="mt-4 text-sm text-ink-soft">
            Photos are read, then thrown away. We only save the items you
            choose.
          </p>
        </div>
      )}
    </div>
  );
}

function ReviewForm({
  receipt,
  rows,
  setRows,
  onStartOver,
}: {
  receipt: ParsedReceipt;
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  onStartOver: () => void;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(
    saveScannedItems,
    {},
  );
  const [storeId, setStoreId] = useState<string>(receipt.storeId);
  const kept = rows.filter((r) => r.keep);

  function update(id: number, patch: Partial<Row>) {
    setRows((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <form action={action} className="receipt space-y-6 p-6 sm:p-8">
      <div>
        <p className="font-display text-2xl font-extrabold">Check what we found</p>
        <p className="mt-1 text-ink-soft">
          Receipts are hard to read, so fix anything that looks wrong and
          untick items you don&apos;t want to track.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border-2 border-markdown bg-markdown-soft px-4 py-3 text-sm font-medium">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="store" className="label">Store</label>
          <select
            id="store"
            name="store"
            className="input"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            required
          >
            <option value="" disabled>Choose a store</option>
            {STORES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="purchase_date" className="label">Purchase date</label>
          <input
            id="purchase_date"
            name="purchase_date"
            type="date"
            className="input"
            defaultValue={receipt.purchaseDate}
            max={todayString()}
            required
          />
        </div>
        <div>
          <label htmlFor="order_number" className="label">Receipt or order number</label>
          <input id="order_number" name="order_number" className="input" defaultValue={receipt.orderNumber} />
        </div>
      </div>

      {storeId === "other" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="custom_store" className="label">Store name</label>
            <input id="custom_store" name="custom_store" className="input" />
          </div>
          <div>
            <label htmlFor="custom_window_days" className="label">Days to claim a price drop</label>
            <input id="custom_window_days" name="custom_window_days" type="number" min={1} max={365} className="input" />
          </div>
        </div>
      )}

      <fieldset>
        <legend className="label">Items ({kept.length} of {rows.length} ticked)</legend>
        {rows.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-ink/25 p-4 text-ink-soft">
            No items were found on this receipt. Add them below, or try a clearer photo.
          </p>
        ) : (
          <ul className="divide-y-2 divide-dashed divide-ink/15">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-[auto_1fr] items-start gap-3 py-3 sm:grid-cols-[auto_1fr_8rem_7rem]">
                <input
                  type="checkbox"
                  checked={r.keep}
                  onChange={(e) => update(r.id, { keep: e.target.checked })}
                  aria-label={`Track ${r.name || "this item"}`}
                  className="mt-3 h-5 w-5 accent-ink"
                />
                <input
                  value={r.name}
                  onChange={(e) => update(r.id, { name: e.target.value })}
                  aria-label="Item name"
                  className="input"
                />
                <input
                  value={r.sku}
                  onChange={(e) => update(r.id, { sku: e.target.value })}
                  aria-label="Item number (SKU)"
                  placeholder="Item #"
                  className="input col-start-2 font-receipt text-sm sm:col-start-auto"
                />
                <input
                  value={r.price}
                  onChange={(e) => update(r.id, { price: e.target.value })}
                  aria-label="Price paid"
                  inputMode="decimal"
                  className="input col-start-2 font-receipt sm:col-start-auto"
                />
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() =>
            setRows((all) => [
              ...all,
              { id: Date.now(), keep: true, name: "", sku: "", price: "" },
            ])
          }
          className="mt-3 font-semibold text-ink underline"
        >
          Add an item the scan missed
        </button>
      </fieldset>

      <input
        type="hidden"
        name="items"
        value={JSON.stringify(kept.map(({ name, sku, price }) => ({ name, sku, price })))}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn px-6 py-3 text-lg" disabled={pending || kept.length === 0}>
          {pending ? "Saving…" : `Save ${kept.length} item${kept.length === 1 ? "" : "s"} to my account`}
        </button>
        <button type="button" onClick={onStartOver} className="btn-ghost px-5 py-3">
          Scan a different receipt
        </button>
        <Link href="/add" className="font-semibold text-ink-soft underline">
          Type it in instead
        </Link>
      </div>
    </form>
  );
}
