"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { cleanPhone } from "@/lib/phone";

export type FormState = { error?: string; message?: string };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const fullName = text(formData, "full_name");
  if (fullName.length > 80) return { error: "Keep your name under 80 characters." };
  const phone = cleanPhone(text(formData, "phone"));
  if (phone === false)
    return { error: "Enter a phone number with 7 to 15 digits, like (555) 123-4567." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName || null,
    phone,
    email_alerts: formData.get("email_alerts") === "on",
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function changePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const password = text(formData, "password");
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };
  if (password !== text(formData, "confirm"))
    return { error: "The two passwords don't match. Type them again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("different from the old"))
      return { error: "That's your current password. Choose a new one." };
    return { error: error.message };
  }
  return { message: "Password changed. Use it next time you log in." };
}

export async function deleteAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (text(formData, "confirm") !== "DELETE")
    return { error: "Type DELETE in capital letters to confirm." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: `Could not delete your account: ${error.message}` };

  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
