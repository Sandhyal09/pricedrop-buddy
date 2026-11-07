import { createClient } from "@/lib/supabase/server";
import { todayString } from "@/lib/stores";

// "Download my data": everything we keep about the logged-in user, as JSON.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Log in first.", { status: 401 });

  // Row level security limits every query to this user's own rows.
  const [profile, purchases, checks] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, email_alerts, updated_at").maybeSingle(),
    supabase.from("purchases").select("*").order("purchase_date", { ascending: false }),
    supabase.from("price_checks").select("purchase_id, price, status, source, checked_at"),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    account: { email: user.email, created_at: user.created_at },
    profile: profile.data,
    purchases: purchases.data ?? [],
    price_checks: checks.data ?? [],
    note:
      "Prices you shared with Price Radar are shown to others without your name or email. We keep a private link to your account only to stop abuse, and remove it if you delete your account.",
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pricedrop-buddy-data-${todayString()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
