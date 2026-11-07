import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AlertsForm } from "@/components/account-forms";
import { PanelHeading } from "@/components/panel-heading";

export const metadata: Metadata = { title: "Email alerts – PriceDrop Buddy™" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_alerts")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <>
      <PanelHeading title="Email alerts">
        Choose whether we email you about deadlines and lower prices.
      </PanelHeading>
      <AlertsForm emailAlerts={profile?.email_alerts ?? true} />
    </>
  );
}
