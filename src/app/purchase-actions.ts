"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { itemKey } from "@/lib/item-key";

const MAX_REPORTS_PER_DAY = 30;

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function done(message?: string, id?: string): never {
  revalidatePath("/dashboard");
  const params = message ? `?error=${encodeURIComponent(message)}` : "";
  redirect(`/dashboard${params}${id ? `#p-${id}` : ""}`);
}

async function ownPurchase(id: string) {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  // Row level security means this only finds the user's own purchase.
  const { data } = await supabase
    .from("purchases")
    .select("id, store_id, sku, item_key, price_paid, last_price")
    .eq("id", id)
    .single();
  return { user, supabase, purchase: data };
}

/** The user looked up today's price and typed it in. */
export async function reportPrice(formData: FormData) {
  const id = field(formData, "id");
  const price = Number(field(formData, "price").replace(/[$,\s]/g, ""));
  const { user, supabase, purchase } = await ownPurchase(id);
  if (!purchase) done("That purchase wasn't found.");
  if (!Number.isFinite(price) || price <= 0 || price > 100000)
    done("Enter today's price, like 259.99.", id);

  const rounded = Math.round(price * 100) / 100;

  // Stop runaway or accidental reports.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from("price_checks")
    .select("id", { count: "exact", head: true })
    .eq("source", "user")
    .gte("checked_at", since);
  if ((count ?? 0) >= MAX_REPORTS_PER_DAY)
    done("You've saved a lot of prices today. Try again tomorrow.", id);
  if (rounded < Number(purchase.price_paid) * 0.2)
    done("That price looks too low. Check the number and try again.", id);

  await supabase
    .from("purchases")
    .update({
      last_price: rounded,
      last_checked_at: new Date().toISOString(),
      last_check_status: "ok",
      last_check_source: "user",
    })
    .eq("id", id);
  await supabase.from("price_checks").insert({
    purchase_id: id,
    user_id: user.id,
    price: rounded,
    status: "ok",
    source: "user",
  });
  // Share it with the Community Price Radar (the reporter stays anonymous).
  if (purchase.item_key) {
    await supabase.from("price_reports").insert({
      store_id: purchase.store_id,
      item_key: purchase.item_key,
      price: rounded,
      source: "user",
    });
  }
  done(undefined, id);
}

/** The user checked and the price hasn't dropped. */
export async function markNoDrop(formData: FormData) {
  const id = field(formData, "id");
  const { user, supabase, purchase } = await ownPurchase(id);
  if (!purchase) done("That purchase wasn't found.");
  await supabase
    .from("purchases")
    .update({
      last_price: null,
      last_checked_at: new Date().toISOString(),
      last_check_status: "no_drop",
      last_check_source: "user",
    })
    .eq("id", id);
  await supabase.from("price_checks").insert({
    purchase_id: id,
    user_id: user.id,
    price: null,
    status: "no_drop",
    source: "user",
  });
  done(undefined, id);
}

/** The store gave the money back. */
export async function markClaimed(formData: FormData) {
  const id = field(formData, "id");
  const amount = Number(field(formData, "amount").replace(/[$,\s]/g, ""));
  const { supabase, purchase } = await ownPurchase(id);
  if (!purchase) done("That purchase wasn't found.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > Number(purchase.price_paid))
    done("Enter the amount the store refunded, like 40.00.", id);
  await supabase
    .from("purchases")
    .update({ status: "claimed", claimed_amount: Math.round(amount * 100) / 100 })
    .eq("id", id);
  done(undefined, id);
}

/** Add or change the product page link (lets us check the price). */
export async function setProductUrl(formData: FormData) {
  const id = field(formData, "id");
  const url = field(formData, "product_url");
  const { supabase, purchase } = await ownPurchase(id);
  if (!purchase) done("That purchase wasn't found.");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
  } catch {
    done("Paste the full product link, starting with https://", id);
  }
  await supabase
    .from("purchases")
    .update({
      product_url: url.slice(0, 2000),
      item_key: itemKey(purchase.store_id, url, purchase.sku),
      last_checked_at: null,
      last_check_status: null,
    })
    .eq("id", id);
  done(undefined, id);
}
