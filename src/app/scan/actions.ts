"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { parseReceipt, type ParsedReceipt } from "@/lib/receipt-parser";
import { getStore, STORES, todayString } from "@/lib/stores";

const MAX_BYTES = 1024 * 1024; // OCR.space free plan: 1 MB per file

export type ReadResult =
  | { ok: true; receipt: ParsedReceipt }
  | { ok: false; error: string };

// Sends the photo to OCR.space, then turns the text into receipt details.
// The photo itself is never stored.
export async function readReceipt(formData: FormData): Promise<ReadResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Log in again to scan receipts." };

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Receipt scanning isn't switched on yet. Add OCR_SPACE_API_KEY in Vercel's Environment Variables, then redeploy.",
    };
  }

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo or PDF of your receipt." };
  }
  const isPdf = file.type === "application/pdf";
  if (!isPdf && !file.type.startsWith("image/")) {
    return { ok: false, error: "That file type isn't supported. Use a photo (JPG or PNG) or a PDF." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "That file is over 1 MB. Try a smaller photo or a 1-page PDF." };
  }

  const body = new FormData();
  body.append("apikey", apiKey);
  body.append("language", "eng");
  body.append("OCREngine", "2");
  body.append("isTable", "true");
  body.append("scale", "true");
  body.append("detectOrientation", "true");
  body.append("filetype", isPdf ? "PDF" : "JPG");
  body.append("file", file, isPdf ? "receipt.pdf" : "receipt.jpg");

  let text = "";
  try {
    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json();
    if (data.IsErroredOnProcessing) {
      const msg = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join(" ")
        : String(data.ErrorMessage ?? "");
      console.error("OCR.space error:", msg);
      return { ok: false, error: "The receipt couldn't be read. Try a sharper, flat photo in good light." };
    }
    text = (data.ParsedResults ?? [])
      .map((r: { ParsedText?: string }) => r.ParsedText ?? "")
      .join("\n");
  } catch (err) {
    console.error("OCR.space request failed:", err);
    return { ok: false, error: "The receipt reader didn't respond. Try again in a minute." };
  }

  if (!text.trim()) {
    return { ok: false, error: "No text was found. Make sure the whole receipt is in the photo and in focus." };
  }

  return { ok: true, receipt: parseReceipt(text, todayString()) };
}

// ---------- Saving the items the user confirmed ----------

export type SaveState = { error?: string };

type IncomingItem = { name: string; sku: string; price: string };

export async function saveScannedItems(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const storeId = String(formData.get("store") ?? "");
  if (!STORES.some((s) => s.id === storeId)) return { error: "Choose the store." };
  const store = getStore(storeId);
  const customStore = String(formData.get("custom_store") ?? "").trim();
  const windowDays =
    store.windowDays ?? Number(formData.get("custom_window_days") ?? "");
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365)
    return { error: "Enter the store's refund window in days (1 to 365)." };

  const purchaseDate = String(formData.get("purchase_date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) || purchaseDate > todayString())
    return { error: "Enter the purchase date from the receipt." };
  const orderNumber = String(formData.get("order_number") ?? "").trim();

  let items: IncomingItem[];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Something went wrong reading the items. Scan again." };
  }
  if (!Array.isArray(items) || items.length === 0)
    return { error: "Tick at least one item to save." };
  if (items.length > 60) return { error: "Save up to 60 items at a time." };

  const rows = [];
  for (const item of items) {
    const name = String(item.name ?? "").trim().slice(0, 200);
    const price = Number(String(item.price ?? "").replace(/[$,\s]/g, ""));
    if (!name) return { error: "Every ticked item needs a name." };
    if (!Number.isFinite(price) || price <= 0)
      return { error: `Check the price for "${name}". It should look like 19.99.` };
    rows.push({
      user_id: user.id,
      store_id: store.id,
      store_name: store.id === "other" && customStore ? customStore : store.name,
      product_name: name,
      sku: String(item.sku ?? "").trim().slice(0, 40) || null,
      order_number: orderNumber || null,
      price_paid: Math.round(price * 100) / 100,
      purchase_date: purchaseDate,
      window_days: windowDays,
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("purchases").insert(rows);
  if (error) {
    console.error("Saving scanned items failed:", error.message);
    return { error: `Couldn't save: ${error.message}` };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?added=${rows.length}`);
}
