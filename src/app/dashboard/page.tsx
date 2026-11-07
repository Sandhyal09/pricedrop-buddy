import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deletePurchase } from "@/app/actions";
import {
  markClaimed,
  markNoDrop,
  reportPrice,
  setProductUrl,
} from "@/app/purchase-actions";
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
  sku: string | null;
  price_paid: number;
  purchase_date: string;
  window_days: number;
  status: string;
  last_price: number | null;
  last_checked_at: string | null;
  last_check_status: string | null;
  last_check_source: string | null;
  claimed_amount: number | null;
  item_key: string | null;
};

/** The moment `hours` ago, as an ISO timestamp. */
function hoursBackIso(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

type Spotted = { price: number; reported_at: string; source: string };

function ago(iso: string): string {
  const h = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3600_000));
  if (h < 1) return "less than an hour ago";
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

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

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function whenChecked(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

/** Where to look up today's price: the saved link, or a search. */
function lookupUrl(p: PurchaseRow): string {
  if (p.product_url) return p.product_url;
  const q = `${p.store_name} ${p.sku ?? ""} ${p.product_name}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const { added, error: actionError } = await props.searchParams;

  if (!isSupabaseConfigured) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("purchases")
    .select(
      "id, store_id, store_name, product_name, product_url, order_number, sku, price_paid, purchase_date, window_days, status, last_price, last_checked_at, last_check_status, last_check_source, claimed_amount, item_key",
    )
    .order("purchase_date", { ascending: false });

  const purchases = ((data ?? []) as PurchaseRow[])
    .map((p) => {
      const deadline = claimDeadline(p.purchase_date, p.window_days);
      const days = daysLeft(deadline);
      const claimed = p.status === "claimed";
      const drop =
        !claimed && p.last_price !== null && Number(p.last_price) < Number(p.price_paid)
          ? Number(p.price_paid) - Number(p.last_price)
          : 0;
      return { ...p, deadline, days, claimed, drop, level: urgency(days) };
    })
    // Money to claim first, then open windows (soonest first), then the rest.
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.claimed || x.days < 0 ? 2 : x.drop > 0 ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return rank(a) === 2 ? b.days - a.days : a.days - b.days;
    });

  // Community Price Radar: lowest price reported for each item in the last 48 hours.
  const keys = [
    ...new Set(
      purchases.filter((p) => p.item_key && p.days >= 0 && !p.claimed).map((p) => p.item_key as string),
    ),
  ];
  const spotted = new Map<string, Spotted>();
  if (keys.length > 0) {
    const { data: reports } = await supabase
      .from("price_reports")
      .select("item_key, price, source, reported_at")
      .in("item_key", keys)
      .gte("reported_at", hoursBackIso(48))
      .order("price", { ascending: true });
    for (const r of reports ?? []) {
      if (!spotted.has(r.item_key)) {
        spotted.set(r.item_key, { price: Number(r.price), reported_at: r.reported_at, source: r.source });
      }
    }
  }

  const openCount = purchases.filter((p) => p.days >= 0 && !p.claimed).length;
  const toClaim = purchases.filter((p) => p.drop > 0 && p.days >= 0);
  const saved = purchases.reduce((sum, p) => sum + (p.claimed ? Number(p.claimed_amount ?? 0) : 0), 0);

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
          <Link href="/scan" className="btn">Scan a receipt</Link>
          <Link href="/add" className="btn-ghost">Type it in</Link>
        </div>
      </div>

      {(saved > 0 || toClaim.length > 0) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {toClaim.length > 0 && (
            <div className="rounded-xl border-2 border-refund bg-refund-soft p-4">
              <p className="text-sm font-semibold text-refund">Ready to claim</p>
              <p className="font-display text-3xl font-extrabold">
                {money.format(toClaim.reduce((s, p) => s + p.drop, 0))}
              </p>
              <p className="text-sm text-ink-soft">
                on {toClaim.length} purchase{toClaim.length === 1 ? "" : "s"}
              </p>
            </div>
          )}
          {saved > 0 && (
            <div className="rounded-xl border-2 border-ink bg-sticker p-4">
              <p className="text-sm font-semibold">Money you&apos;ve got back</p>
              <p className="font-display text-3xl font-extrabold">{money.format(saved)}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <Message
          error={
            error
              ? `Could not load purchases: ${error.message}`
              : (Array.isArray(actionError) ? actionError[0] : actionError)
          }
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
            <Link href="/scan" className="btn">Scan a receipt</Link>
            <Link href="/add" className="btn-ghost">Type it in</Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-6">
          {purchases.map((p) => {
            const store = getStore(p.store_id);
            const open = p.days >= 0 && !p.claimed;
            return (
              <li key={p.id} id={`p-${p.id}`} className="receipt scroll-mt-6 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {p.product_url ? (
                        <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {p.product_name}
                        </a>
                      ) : (
                        p.product_name
                      )}
                    </p>
                    <p className="mt-1 font-receipt text-sm text-ink-soft">
                      {p.store_name} · paid {money.format(Number(p.price_paid))} · bought{" "}
                      {formatDate(p.purchase_date)}
                      {p.order_number ? ` · #${p.order_number}` : ""}
                    </p>
                  </div>
                  {p.claimed ? (
                    <span className="tag text-sm bg-refund text-paper">
                      Got back {money.format(Number(p.claimed_amount ?? 0))}
                    </span>
                  ) : (
                    <span className={`tag text-sm ${BADGE[p.level]}`}>{badgeText(p.days)}</span>
                  )}
                </div>

                {/* Money to claim */}
                {open && p.drop > 0 && (
                  <div className="mt-4 rounded-lg border-2 border-refund bg-refund-soft p-4">
                    <p className="font-display text-2xl font-extrabold text-refund">
                      Claim {money.format(p.drop)}
                    </p>
                    <p className="mt-1 text-ink">
                      The price is now <strong>{money.format(Number(p.last_price))}</strong>
                      {p.last_checked_at ? ` (checked ${whenChecked(p.last_checked_at)})` : ""}. Ask{" "}
                      {p.store_name} for the difference by <strong>{formatDate(p.deadline)}</strong>.{" "}
                      {store.howToClaim}
                    </p>
                    <form action={markClaimed} className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <div>
                        <label htmlFor={`amt-${p.id}`} className="label">Amount refunded ($)</label>
                        <input
                          id={`amt-${p.id}`}
                          name="amount"
                          inputMode="decimal"
                          defaultValue={p.drop.toFixed(2)}
                          className="input w-32 font-receipt"
                        />
                      </div>
                      <button className="btn">I got my money back</button>
                    </form>
                  </div>
                )}

                {/* Community Price Radar */}
                {open && p.item_key && (() => {
                  const s = spotted.get(p.item_key);
                  if (!s || s.price >= Number(p.price_paid)) return null;
                  if (p.last_price !== null && Number(p.last_price) <= s.price) return null;
                  return (
                    <div className="mt-4 rounded-lg border-2 border-dashed border-ink bg-sticker-soft p-4">
                      <p className="font-semibold">
                        Price Radar: {s.source === "auto" ? "our price checker" : "a PriceDrop Buddy shopper"} saw
                        this for <strong>{money.format(s.price)}</strong> {ago(s.reported_at)}.
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        That&apos;s up to {money.format(Number(p.price_paid) - s.price)} back. Check the price
                        yourself (it can vary by location), then confirm it.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <a href={lookupUrl(p)} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-1.5 text-sm">
                          Check the price
                        </a>
                        <form action={reportPrice}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="price" value={s.price.toFixed(2)} />
                          <button className="btn px-3 py-1.5 text-sm">I see {money.format(s.price)} too</button>
                        </form>
                      </div>
                    </div>
                  );
                })()}

                {/* Price status and one-tap check */}
                {open && (
                  <div className="mt-4 space-y-3 text-sm">
                    <PriceStatus p={p} />
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={lookupUrl(p)} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-1.5 text-sm">
                        Check today&apos;s price
                      </a>
                      <form action={reportPrice} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={p.id} />
                        <label htmlFor={`price-${p.id}`} className="sr-only">Today&apos;s price</label>
                        <span className="font-receipt">$</span>
                        <input
                          id={`price-${p.id}`}
                          name="price"
                          inputMode="decimal"
                          placeholder="Today's price"
                          className="input w-32 py-1.5 font-receipt text-sm"
                        />
                        <button className="btn px-3 py-1.5 text-sm">Save price</button>
                      </form>
                      <form action={markNoDrop}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="font-semibold text-ink underline">No drop today</button>
                      </form>
                    </div>
                    {!p.product_url && (
                      <details>
                        <summary className="cursor-pointer font-semibold text-ink-soft">
                          Add the product link so we can check the price for you
                        </summary>
                        <form action={setProductUrl} className="mt-2 flex flex-wrap gap-2">
                          <input type="hidden" name="id" value={p.id} />
                          <label htmlFor={`url-${p.id}`} className="sr-only">Product link</label>
                          <input
                            id={`url-${p.id}`}
                            name="product_url"
                            type="url"
                            placeholder="https://www.costco.com/..."
                            className="input max-w-md py-1.5 text-sm"
                          />
                          <button className="btn-ghost px-3 py-1.5 text-sm">Save link</button>
                        </form>
                      </details>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-ink/20 pt-3 text-sm">
                  <p className="text-ink">
                    {p.claimed ? (
                      <>Refund claimed. Nice work.</>
                    ) : p.days >= 0 ? (
                      <>
                        Claim by <strong>{formatDate(p.deadline)}</strong>.{" "}
                        {p.drop > 0 ? "" : store.howToClaim}
                      </>
                    ) : (
                      <>Window closed on {formatDate(p.deadline)}.</>
                    )}
                  </p>
                  <form action={deletePurchase}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="font-semibold text-ink-soft hover:text-markdown hover:underline">Remove</button>
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

function PriceStatus({ p }: { p: PurchaseRow & { drop: number } }) {
  if (p.drop > 0) return null; // the green box already says it
  const by = p.last_check_source === "user" ? "You checked" : "We checked";
  if (p.last_checked_at && p.last_check_status === "ok" && p.last_price !== null) {
    return (
      <p className="text-ink">
        {by} {whenChecked(p.last_checked_at)}: {money.format(Number(p.last_price))}, no drop yet.
      </p>
    );
  }
  if (p.last_checked_at && p.last_check_status === "no_drop") {
    return <p className="text-ink">You checked {whenChecked(p.last_checked_at)}: no drop yet.</p>;
  }
  if (p.product_url && !p.last_checked_at) {
    return <p className="text-ink-soft">We&apos;ll try to check this price automatically within 6 hours.</p>;
  }
  if (!p.product_url) {
    return (
      <p className="text-ink-soft">
        Tap &quot;Check today&apos;s price&quot; and save the price you see, or add the product
        link below so we can try checking it for you.
      </p>
    );
  }
  return (
    <p className="text-ink-soft">
      {p.store_name} doesn&apos;t allow automatic price checks. Tap &quot;Check today&apos;s
      price&quot;, then save the price you see.
    </p>
  );
}
