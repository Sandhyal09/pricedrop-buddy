// Decides which reminders to send and writes the emails.
// No network or database here, so it can be tested on its own.

import {
  claimDeadline,
  daysLeft,
  formatDate,
  getStore,
} from "../src/lib/stores.ts";

export type PurchaseForReminder = {
  id: string;
  user_id: string;
  store_id: string;
  store_name: string;
  product_name: string;
  product_url: string | null;
  price_paid: number;
  purchase_date: string;
  window_days: number;
  status: string;
  reminded_3d: boolean;
  reminded_1d: boolean;
  last_price: number | null;
  last_checked_at: string | null;
  last_check_status: string | null;
};

export type Kind = "3d" | "1d";

export type DueItem = PurchaseForReminder & {
  kind: Kind;
  deadline: string;
  days: number;
};

/**
 * "3d": 2 or 3 days left and no early reminder sent yet.
 * "1d": 0 or 1 day left and no last-chance reminder sent yet.
 * Using ranges (not exact days) means a skipped day still gets caught up.
 */
export function pickDue(
  purchases: PurchaseForReminder[],
  today: string,
): DueItem[] {
  const due: DueItem[] = [];
  for (const p of purchases) {
    if (p.status !== "tracking") continue;
    const deadline = claimDeadline(p.purchase_date, p.window_days);
    const days = daysLeft(deadline, today);
    if (days >= 0 && days <= 1 && !p.reminded_1d) {
      due.push({ ...p, kind: "1d", deadline, days });
    } else if (days >= 2 && days <= 3 && !p.reminded_3d) {
      due.push({ ...p, kind: "3d", deadline, days });
    }
  }
  return due;
}

export function groupByUser(items: DueItem[]): Map<string, DueItem[]> {
  const map = new Map<string, DueItem[]>();
  for (const item of items) {
    const list = map.get(item.user_id) ?? [];
    list.push(item);
    map.set(item.user_id, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.days - b.days);
  return map;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function whenText(days: number): string {
  if (days === 0) return "today is the last day";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type Email = { subject: string; text: string; html: string };

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export type PriceNote = { kind: "drop" | "same" | "unknown"; text: string };

/** One line about the price, based on the latest check. */
export function priceNote(
  i: Pick<PurchaseForReminder, "price_paid" | "last_price" | "last_checked_at" | "last_check_status" | "store_name">,
): PriceNote {
  const paid = Number(i.price_paid);
  const last = i.last_price === null ? null : Number(i.last_price);
  const when = i.last_checked_at ? shortDate(i.last_checked_at) : "";
  if (last !== null && last < paid) {
    return {
      kind: "drop",
      text: `Price dropped to ${money.format(last)}${when ? ` (checked ${when})` : ""}. You can claim ${money.format(paid - last)}.`,
    };
  }
  if (last !== null && i.last_checked_at && ["ok", "no_drop"].includes(i.last_check_status ?? "")) {
    return { kind: "same", text: `Last checked ${when}: ${money.format(last)}, no drop yet.` };
  }
  if (i.last_check_status === "no_drop" && when) {
    return { kind: "same", text: `You checked on ${when}: no drop yet.` };
  }
  return {
    kind: "unknown",
    text: `${i.store_name} doesn't allow automatic price checks. Open the product page, then tap "Price dropped" or "No drop" on your dashboard.`,
  };
}

export function buildEmail(items: DueItem[], siteUrl: string): Email {
  const soonest = items[0];
  const subject =
    items.length === 1
      ? soonest.days <= 1
        ? `Last chance: claim any price drop on ${soonest.product_name}`
        : `${soonest.days} days left to claim a price drop on ${soonest.product_name}`
      : `${items.length} purchases have refund deadlines coming up`;

  const intro =
    "If the price has dropped since you bought these, the store will refund the difference, but only until the date shown. Check today's price, then claim it.";

  const textLines = items.map((i) => {
    const store = getStore(i.store_id);
    return [
      `- ${i.product_name} (${i.store_name}, paid ${money.format(Number(i.price_paid))})`,
      `  Claim by ${formatDate(i.deadline)}: ${whenText(i.days)}.`,
      `  ${priceNote(i).text}`,
      `  How to claim: ${store.howToClaim}`,
      i.product_url ? `  Check today's price: ${i.product_url}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  const text = [
    "Hi,",
    "",
    intro,
    "",
    ...textLines,
    "",
    `See all your purchases: ${siteUrl}/dashboard`,
    "",
    "PriceDrop Buddy",
    "You get these reminders because you track purchases on PriceDrop Buddy.",
  ].join("\n");

  const rows = items
    .map((i) => {
      const store = getStore(i.store_id);
      const urgent = i.days <= 1;
      const link = i.product_url
        ? `<a href="${escapeHtml(i.product_url)}" style="color:#1d1a4f;font-weight:700">Check today's price</a>`
        : "";
      return `
      <tr><td style="padding:16px;border-bottom:2px dashed #d6d5e6">
        <div style="font-size:17px;font-weight:700;color:#1d1a4f">${escapeHtml(i.product_name)}</div>
        <div style="font-family:Menlo,Consolas,monospace;font-size:13px;color:#4b4874;margin-top:4px">
          ${escapeHtml(i.store_name)} · paid ${money.format(Number(i.price_paid))}
        </div>
        <div style="margin-top:10px">
          <span style="display:inline-block;padding:4px 10px;border-radius:4px;font-weight:800;font-size:14px;background:${urgent ? "#e4252f" : "#ffd60a"};color:${urgent ? "#ffffff" : "#1d1a4f"}">
            ${whenText(i.days)}
          </span>
          <span style="margin-left:8px;color:#1d1a4f">Claim by <b>${formatDate(i.deadline)}</b></span>
        </div>
        ${priceNoteHtml(priceNote(i))}
        <div style="margin-top:8px;font-size:14px;color:#1d1a4f">${escapeHtml(store.howToClaim)}</div>
        ${link ? `<div style="margin-top:8px;font-size:14px">${link}</div>` : ""}
      </td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#eef0fb;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0fb;padding:24px 0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td style="background:#ffd60a;border:2px solid #1d1a4f;padding:14px 20px;font-weight:800;font-size:18px;color:#1d1a4f">PriceDrop Buddy</td></tr>
      <tr><td style="background:#ffffff;padding:20px">
        <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#1d1a4f">${escapeHtml(subject)}</p>
        <p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:#4b4874">${escapeHtml(intro)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">${rows}</table>
        <p style="margin:20px 0 0"><a href="${escapeHtml(siteUrl)}/dashboard" style="display:inline-block;background:#1d1a4f;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">See all my purchases</a></p>
      </td></tr>
      <tr><td style="padding:14px 4px;font-size:12px;color:#4b4874">You get these reminders because you track purchases on PriceDrop Buddy. Store policies change: check with the store before you claim.</td></tr>
    </table>
  </td></tr></table></body></html>`;

  return { subject, text, html };
}

function priceNoteHtml(note: PriceNote): string {
  const styles: Record<PriceNote["kind"], string> = {
    drop: "background:#dcf5e8;border:2px solid #0b7a4b;color:#1d1a4f;font-weight:700",
    same: "background:#f4f4fa;color:#4b4874",
    unknown: "background:#fff4b8;color:#1d1a4f",
  };
  return `<div style="margin-top:10px;padding:8px 10px;border-radius:6px;font-size:14px;${styles[note.kind]}">${escapeHtml(note.text)}</div>`;
}

// ---------- Instant "price dropped" alert ----------

export type DropItem = PurchaseForReminder & { deadline: string; days: number; newPrice: number };

export function buildDropEmail(items: DropItem[], siteUrl: string): Email {
  const total = items.reduce((sum, i) => sum + (Number(i.price_paid) - i.newPrice), 0);
  const first = items[0];
  const subject =
    items.length === 1
      ? `Price drop: claim ${money.format(Number(first.price_paid) - first.newPrice)} on ${first.product_name}`
      : `Price drops on ${items.length} purchases: claim up to ${money.format(total)}`;
  const intro = "Good news: the price went down after you bought. Ask the store for the difference before the deadline.";

  const text = [
    "Hi,",
    "",
    intro,
    "",
    ...items.map((i) => {
      const store = getStore(i.store_id);
      return [
        `- ${i.product_name} (${i.store_name})`,
        `  You paid ${money.format(Number(i.price_paid))}. Now ${money.format(i.newPrice)}. Claim ${money.format(Number(i.price_paid) - i.newPrice)}.`,
        `  Claim by ${formatDate(i.deadline)} (${whenText(i.days)}).`,
        `  How to claim: ${store.howToClaim}`,
        i.product_url ? `  Product page: ${i.product_url}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }),
    "",
    `Open your dashboard: ${siteUrl}/dashboard`,
    "",
    "PriceDrop Buddy",
  ].join("\n");

  const rows = items
    .map((i) => {
      const store = getStore(i.store_id);
      const saving = Number(i.price_paid) - i.newPrice;
      return `
      <tr><td style="padding:16px;border-bottom:2px dashed #d6d5e6">
        <div style="font-size:17px;font-weight:700;color:#1d1a4f">${escapeHtml(i.product_name)}</div>
        <div style="font-family:Menlo,Consolas,monospace;font-size:14px;color:#4b4874;margin-top:6px">
          ${escapeHtml(i.store_name)} · <s style="color:#e4252f">${money.format(Number(i.price_paid))}</s> → <b style="color:#1d1a4f">${money.format(i.newPrice)}</b>
        </div>
        <div style="margin-top:10px;display:inline-block;padding:6px 12px;border:3px solid #0b7a4b;border-radius:999px;color:#0b7a4b;font-weight:800;font-size:16px">
          Claim ${money.format(saving)}
        </div>
        <div style="margin-top:10px;color:#1d1a4f">Claim by <b>${formatDate(i.deadline)}</b> (${whenText(i.days)}). ${escapeHtml(store.howToClaim)}</div>
        ${i.product_url ? `<div style="margin-top:8px;font-size:14px"><a href="${escapeHtml(i.product_url)}" style="color:#1d1a4f;font-weight:700">See the lower price</a></div>` : ""}
      </td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#eef0fb;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0fb;padding:24px 0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td style="background:#ffd60a;border:2px solid #1d1a4f;padding:14px 20px;font-weight:800;font-size:18px;color:#1d1a4f">PriceDrop Buddy</td></tr>
      <tr><td style="background:#ffffff;padding:20px">
        <p style="margin:0;font-size:22px;font-weight:800;color:#1d1a4f">${escapeHtml(subject)}</p>
        <p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:#4b4874">${escapeHtml(intro)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">${rows}</table>
        <p style="margin:20px 0 0"><a href="${escapeHtml(siteUrl)}/dashboard" style="display:inline-block;background:#1d1a4f;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Open my dashboard</a></p>
      </td></tr>
      <tr><td style="padding:14px 4px;font-size:12px;color:#4b4874">Prices can change again quickly, so claim soon. Store policies change: check with the store before you claim.</td></tr>
    </table>
  </td></tr></table></body></html>`;

  return { subject, text, html };
}
