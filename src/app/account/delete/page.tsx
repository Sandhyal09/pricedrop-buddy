import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteForm } from "@/components/account-forms";
import { PanelHeading } from "@/components/panel-heading";

export const metadata: Metadata = { title: "Delete account – PriceDrop Buddy™" };

export default async function DeletePage() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("purchases")
    .select("id", { count: "exact", head: true });

  return (
    <>
      <PanelHeading title="Delete account">
        Leaving? You can{" "}
        <Link href="/account/data" className="font-semibold text-ink underline">
          download a copy of your data
        </Link>{" "}
        first.
      </PanelHeading>
      <div className="rounded-xl border-2 border-markdown bg-markdown-soft/50 p-5">
        <DeleteForm purchaseCount={count ?? 0} />
      </div>
    </>
  );
}
