import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deletePurchase } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  claimDeadline,
  daysLeft,
  formatDate,
  getStore,
  urgency,
  type Urgency,
} from "@/lib/stores";
import { Message, SetupNotice } from "@/components/notices";

export const metadata: Metadata = { title: "My purchases – PriceDrop Buddy™" };

type PurchaseRow = {
  id: string;
  store_id: string;
  store_name: string;
  product_name: string;
  product_url: string | null;
  order_number: string | null;
  price_paid: number;
  purchase_date: string;
  window_days: number;
};

const BADGE: Record<Urgency, string> = {
  open: "tag-open",
  soon: "tag-soon",
  closed: "tag-closed",
};

function badgeText(days: number): string {
  if (days < 0) return "Claim window closed";
  if (days === 0) return "Last day to claim!";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const { added } = await props.searchParams;

  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("purchases")
    .select(
      "id, store_id, store_name, product_name, product_url, order_number, price_paid, purchase_date, window_days",
    )
    .order("purchase_date", { ascending: false });

  const purchases = ((data ?? []) as PurchaseRow[])
    .map((p) => {
      const deadline = claimDeadline(p.purchase_date, p.window_days);
      const days = daysLeft(deadline);
      return { ...p, deadline, days, level: urgency(days) };
    })
    // Open deadlines first (soonest at the top), closed ones at the bottom.
    .sort((a, b) => {
      if ((a.days < 0) !== (b.days < 0)) return a.days < 0 ? 1 : -1;
      return a.days < 0 ? b.days - a.days : a.days - b.days;
    });

  const openCount = purchases.filter((p) => p.days >= 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">My purchases</h1>
          <p className="mt-1 text-ink-soft">
            {openCount === 0
              ? "No claim windows open right now."
              : `${openCount} purchase${openCount === 1 ? "" : "s"} still inside the claim window.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/scan" className="btn">
            Scan a receipt
          </Link>
          <Link href="/add" className="btn-ghost">
            Type it in
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <Message
          error={error ? `Could not load purchases: ${error.message}` : undefined}
          info={
            added
              ? Number(added) > 1
                ? `Saved ${added} items. We'll track every deadline for you.`
                : "Saved! We'll track the deadline for you."
              : undefined
          }
        />
      </div>

      {purchases.length === 0 ? (
        <div className="receipt p-10 text-center">
          <p className="font-display text-2xl font-extrabold">No purchases yet</p>
          <p className="mt-2 text-ink-soft">
            Add something you bought in the last few weeks. Its refund window may still be open.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/scan" className="btn">
              Scan a receipt
            </Link>
            <Link href="/add" className="btn-ghost">
              Type it in
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-6">
          {purchases.map((p) => {
            const store = getStore(p.store_id);
            return (
              <li
                key={p.id}
                className="receipt p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {p.product_url ? (
                        <a
                          href={p.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {p.product_name}
                        </a>
                      ) : (
                        p.product_name
                      )}
                    </p>
                    <p className="mt-1 font-receipt text-sm text-ink-soft">
                      {p.store_name} · {money.format(Number(p.price_paid))} ·
                      bought {formatDate(p.purchase_date)}
                      {p.order_number ? ` · #${p.order_number}` : ""}
                    </p>
                  </div>
                  <span
                    className={`tag text-sm ${BADGE[p.level]}`}
                  >
                    {badgeText(p.days)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-ink/20 pt-3 text-sm">
                  <p className="text-ink">
                    {p.days >= 0 ? (
                      <>
                        Claim by <strong>{formatDate(p.deadline)}</strong>.{" "}
                        {store.howToClaim}
                      </>
                    ) : (
                      <>Window closed on {formatDate(p.deadline)}.</>
                    )}
                  </p>
                  <form action={deletePurchase}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="font-semibold text-ink-soft hover:text-markdown hover:underline">
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
