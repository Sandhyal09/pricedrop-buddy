# PriceDrop Buddy™

**Scan any receipt from any big store and never miss a price-drop refund deadline, for free.**

Stores like Target, Best Buy, Home Depot and Costco refund the difference when a price drops soon after you buy, but only for 14–30 days. Most people forget. PriceDrop Buddy tracks every deadline and tells you how to claim.

## What works today (Version 1, part 1)

- Sign up and log in with email and password
- Add a purchase: product, store, price paid, date, link, order number
- Dashboard with a countdown for every purchase: claim deadline, days left, red when 3 days or fewer
- Store-specific "how to claim" tips
- Each user sees only their own purchases (database row level security)

**Coming next:** receipt scanning with a review screen, reminder emails, Proof Pack, Claim Success Board, Before-You-Buy checker.

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

### 3. Run it on your own computer (optional)

```bash
npm install
cp .env.example .env.local   # then paste your two values into .env.local
npm run dev                  # open http://localhost:3000
```
