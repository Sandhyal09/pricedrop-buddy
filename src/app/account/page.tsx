import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/phone";
import { DeleteForm, PasswordForm, ProfileForm } from "@/components/account-forms";
import { SetupNotice } from "@/components/notices";

export const metadata: Metadata = { title: "My account – PriceDrop Buddy™" };

function Section({
  title,
  children,
  danger = false,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border-2 bg-paper p-6 ${danger ? "border-markdown" : "border-ink"}`}
    >
      <h2 className="mb-4 font-display text-2xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, email_alerts")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const joined = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <SetupNotice />
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          {profile?.full_name ? `Hi, ${profile.full_name}` : "My account"}
        </h1>
        <p className="mt-2 text-ink-soft">
          Signed in as <strong className="text-ink">{user.email}</strong>. Member since {joined}.
        </p>
      </div>

      <Section title="Your details">
        <ProfileForm
          fullName={profile?.full_name ?? ""}
          phone={formatPhone(profile?.phone ?? null)}
          emailAlerts={profile?.email_alerts ?? true}
        />
      </Section>

      <Section title="Password">
        <PasswordForm />
      </Section>

      <Section title="Your data">
        <p>
          Download everything we keep about you: your details, purchases and price checks, as
          one file.
        </p>
        <a href="/account/export" className="btn-ghost mt-4" download>
          Download my data
        </a>
        <p className="mt-4 text-sm text-ink-soft">
          Read how we use it in our{" "}
          <Link href="/privacy" className="font-semibold text-ink underline">
            privacy page
          </Link>
          .
        </p>
      </Section>

      <Section title="Delete account" danger>
        <DeleteForm purchaseCount={count ?? 0} />
      </Section>
    </div>
  );
}
