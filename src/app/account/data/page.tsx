import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PanelHeading } from "@/components/panel-heading";

export const metadata: Metadata = { title: "Your data – PriceDrop Buddy™" };

export default async function DataPage() {
  const supabase = await createClient();
  const [{ count: purchases }, { count: checks }] = await Promise.all([
    supabase.from("purchases").select("id", { count: "exact", head: true }),
    supabase.from("price_checks").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { value: purchases ?? 0, label: "purchases saved" },
    { value: checks ?? 0, label: "prices recorded" },
  ];

  return (
    <>
      <PanelHeading title="Your data">
        See what we keep about you, and take a copy whenever you like.
      </PanelHeading>
      <dl className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border-2 border-ink bg-sticker-soft p-4">
            <dt className="text-sm text-ink-soft">{s.label}</dt>
            <dd className="font-receipt text-3xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6">
        The download has your details, every purchase and every price we recorded, in one JSON
        file you can open in any text editor.
      </p>
      <a href="/account/export" className="btn mt-4 px-5 py-2.5" download>
        Download my data
      </a>
      <p className="mt-6 text-sm text-ink-soft">
        Read how we use it on our{" "}
        <Link href="/privacy" className="font-semibold text-ink underline">
          privacy page
        </Link>
        .
      </p>
    </>
  );
}
