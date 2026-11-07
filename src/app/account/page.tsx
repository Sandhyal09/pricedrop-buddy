import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/phone";
import { DetailsForm } from "@/components/account-forms";
import { PanelHeading } from "@/components/panel-heading";

export const metadata: Metadata = { title: "Your details – PriceDrop Buddy™" };

export default async function DetailsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <>
      <PanelHeading title="Your details">Your name and how to reach you.</PanelHeading>
      <DetailsForm
        fullName={profile?.full_name ?? ""}
        email={user?.email ?? ""}
        phone={formatPhone(profile?.phone ?? null)}
      />
    </>
  );
}
