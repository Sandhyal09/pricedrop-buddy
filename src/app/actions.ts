"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { getStore, STORES } from "@/lib/stores";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function back(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// ---------- Accounts ----------

export type AuthState = { error?: string; message?: string; email?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password don't match. Check them, or create an account first.";
  if (m.includes("email not confirmed"))
    return "Confirm your email first: open the link we sent you, then log in.";
  if (m.includes("already registered"))
    return "This email already has an account. Switch to Log in.";
  if (m.includes("rate limit"))
    return "Too many emails sent in the last hour. Wait a while, then try again.";
  return message;
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email");
  const password = text(formData, "password");
  if (!EMAIL_PATTERN.test(email))
    return { error: "Enter a valid email address, like you@example.com.", email };
  if (password.length < 8)
    return { error: "Use a password with at least 8 characters.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error) return { error: friendlyAuthError(error.message), email };

  // Supabase hides whether an email is already registered: an existing
  // account comes back with no identities.
  if (data.user && data.user.identities?.length === 0)
    return { error: friendlyAuthError("already registered"), email };

  // With email confirmation on, there is no session until the link is opened.
  if (!data.session)
    return {
      message: `Almost done. We sent a confirmation link to ${email}. Open it to start tracking. Check your spam folder if it isn't there in a minute.`,
    };
  redirect("/dashboard");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = text(formData, "email");
  const password = text(formData, "password");
  if (!EMAIL_PATTERN.test(email) || !password)
    return { error: "Enter your email and password.", email };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyAuthError(error.message), email };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------- Purchases ----------

export async function addPurchase(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/login");

  const storeId = text(formData, "store");
  if (!STORES.some((s) => s.id === storeId)) back("/add", "Choose a store.");
  const store = getStore(storeId);

  const productName = text(formData, "product_name");
  const productUrl = text(formData, "product_url");
  const orderNumber = text(formData, "order_number");
  const purchaseDate = text(formData, "purchase_date");
  const price = Number(text(formData, "price_paid"));
  const customStore = text(formData, "custom_store");
  const windowDays =
    store.windowDays ?? Number(text(formData, "custom_window_days"));

  if (!productName) back("/add", "Enter the product name.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate))
    back("/add", "Enter the purchase date.");
  if (!Number.isFinite(price) || price <= 0)
    back("/add", "Enter the price you paid, like 49.99.");
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365)
    back("/add", "Enter the store's refund window in days (1 to 365).");
  if (productUrl && !/^https?:\/\//i.test(productUrl))
    back("/add", "The product link should start with https://");

  const supabase = await createClient();
  const { error } = await supabase.from("purchases").insert({
    user_id: user.id,
    store_id: store.id,
    store_name: store.id === "other" && customStore ? customStore : store.name,
    product_name: productName,
    product_url: productUrl || null,
    order_number: orderNumber || null,
    price_paid: Math.round(price * 100) / 100,
    purchase_date: purchaseDate,
    window_days: windowDays,
  });
  if (error) back("/add", `Could not save: ${error.message}`);

  revalidatePath("/dashboard");
  redirect("/dashboard?added=1");
}

export async function deletePurchase(formData: FormData) {
  const user = await getUser();
  if (!user) redirect("/login");
  const id = text(formData, "id");
  const supabase = await createClient();
  // Row level security also makes sure users can only delete their own rows.
  await supabase.from("purchases").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
