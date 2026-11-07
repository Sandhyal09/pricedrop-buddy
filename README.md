# PriceDrop Buddy™

**Scan any receipt from any big store and never miss a price-drop refund deadline, for free.**

Stores like Target, Best Buy, Home Depot and Costco refund the difference when a price drops soon after you buy, but only for 14–30 days. Most people forget. PriceDrop Buddy tracks every deadline and tells you how to claim.

## What works today

- Sign up and log in with email and password
- **Scan a receipt:** take a photo (or upload a screenshot or PDF of an online order). The app reads the store, date, receipt number and every item, then shows a review screen where you fix mistakes and untick items before saving. Photos are never stored.
- Or type a purchase in: product, store, price paid, date, link, order number
- Dashboard with a countdown for every purchase: claim deadline, days left, red when 3 days or fewer
- Store-specific "how to claim" tips
- Each user sees only their own purchases (database row level security)

- **Reminder emails:** every morning, users get one email listing purchases whose claim window ends in 3 days, and again on the last day

**Coming next:** Proof Pack, Claim Success Board, Before-You-Buy checker.

## Supported stores

| Store | Days to claim a price drop |
| --- | --- |
| Best Buy | 15 |
| Target | 14 |
| Home Depot | 30 |
| Costco | 30 |
| Other | You enter it |

Store rules live in one file: [`src/lib/stores.ts`](src/lib/stores.ts). Policies change, so recheck them every few months.

## Built with

Next.js · Supabase (database + login) · Tailwind CSS · Vercel (hosting). All on free plans.

---

## Setup guide (beginner friendly)

### 1. Connect the database

1. In Supabase, create a project (free plan) and wait about 2 minutes.
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. You should see "Success."
3. Open **Project Settings → API** (or **API Keys**). You need two values:
   - **Project URL**
   - **Publishable key** (older projects call it the **anon public** key)

   Never use the **secret** or **service_role** key in this app.

### 2. Put it online with Vercel

1. In Vercel, click **Add New → Project** and import this repository.
2. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = your publishable key
3. Click **Deploy**.
4. Back in Supabase, open **Authentication → URL Configuration** and set **Site URL** to your Vercel address (for example `https://pricedrop-buddy.vercel.app`). Add `https://YOUR-ADDRESS.vercel.app/auth/callback` under **Redirect URLs**. This makes the sign-up confirmation email link work.

### 3. Switch on receipt scanning

1. Get a free API key at [ocr.space](https://ocr.space/ocrapi/freekey) (25,000 scans a month, 1 MB per file).
2. In Vercel, open **Settings → Environment Variables** and add `OCR_SPACE_API_KEY` with your key. Don't add `NEXT_PUBLIC_` in front: this key must stay on the server.
3. Redeploy (Deployments → ⋯ → Redeploy).
4. In Supabase, run [`supabase/updates/002_add_sku.sql`](supabase/updates/002_add_sku.sql) in the SQL Editor once. It adds the item number (SKU) column.

How receipts are read: [OCR.space](https://ocr.space) turns the photo into text, then simple rules in [`src/lib/receipt-parser.ts`](src/lib/receipt-parser.ts) find the store, date, order number and item lines (name, SKU, price), skipping totals, taxes and payment lines.

### 4. Switch on reminder emails

Reminders run every morning on GitHub Actions ([`.github/workflows/reminders.yml`](.github/workflows/reminders.yml)) and send through Gmail.

1. In Supabase, run [`supabase/updates/003_reminders.sql`](supabase/updates/003_reminders.sql) and [`supabase/updates/004_reminder_access.sql`](supabase/updates/004_reminder_access.sql) once.
2. Turn on 2-Step Verification for the Gmail account, then create an **App password** at myaccount.google.com/apppasswords.
3. In GitHub, open **Settings → Secrets and variables → Actions** and add these repository secrets:
   - `SUPABASE_URL`: your Supabase Project URL
   - `SUPABASE_SECRET_KEY`: the **secret** key from Supabase → Project Settings → API Keys (never put this in Vercel or the code)
   - `GMAIL_USER`: the Gmail address that sends the emails
   - `GMAIL_APP_PASSWORD`: the 16-character app password
4. Test it: **Actions → Daily reminders → Run workflow** with "Dry run" ticked shows the emails in the log without sending. Untick it to send for real.

How it works: [`scripts/reminders-core.mts`](scripts/reminders-core.mts) picks purchases with 2–3 days left (first reminder) or 0–1 days left (last chance), groups them into one email per user, and [`scripts/send-reminders.mts`](scripts/send-reminders.mts) sends them and marks them as sent so nobody gets a reminder twice.

### 5. Run it on your own computer (optional)

```bash
npm install
cp .env.example .env.local   # then paste your values into .env.local
npm run dev                  # open http://localhost:3000
```
