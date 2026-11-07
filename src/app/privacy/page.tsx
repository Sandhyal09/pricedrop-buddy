import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy – PriceDrop Buddy™" };

const KEPT = [
  ["Your email and password", "To log you in and send your alerts. Passwords are stored scrambled (hashed) by our login service, so nobody can read them."],
  ["Your name and phone number", "Only if you add them. Your name is used to greet you. Your phone number is only shown to you; we don't send texts yet."],
  ["Your purchases", "Product, store, price paid, dates, order number and product link, so we can count down your refund deadlines."],
  ["Prices seen for your purchases", "From you or from our price checker, so we can tell you when a price drops."],
  ["Your email settings", "Whether you want reminder and price-drop emails."],
];

const HELPERS = [
  ["Supabase", "stores your account and purchases, and handles logging in."],
  ["Vercel", "runs this website."],
  ["GitHub Actions", "runs the scheduled jobs that check prices and send reminders."],
  ["Gmail", "sends the reminder and price-drop emails."],
  ["OCR.space", "reads the text on a receipt photo when you scan one. We don't keep the photo."],
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 leading-relaxed">
      <header>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Your privacy</h1>
        <p className="mt-2 text-ink-soft">Last updated November 7, 2026</p>
        <p className="mt-4 text-lg">
          PriceDrop Buddy keeps only what it needs to get your money back. We don&apos;t sell
          your data, we don&apos;t show ads, and we don&apos;t use tracking cookies. The only
          cookie keeps you logged in.
        </p>
      </header>

      <section>
        <h2 className="font-display text-2xl font-extrabold">What we keep, and why</h2>
        <dl className="mt-4 space-y-4">
          {KEPT.map(([what, why]) => (
            <div key={what} className="rounded-lg border-2 border-ink/15 bg-paper p-4">
              <dt className="font-bold">{what}</dt>
              <dd className="mt-1 text-ink-soft">{why}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="font-display text-2xl font-extrabold">What other shoppers can see</h2>
        <p className="mt-3">
          Only prices. When you save today&apos;s price, Price Radar shares the price, the store
          and which product it was, so other buyers of the same item can claim a refund too. It
          never shows your name, email, phone, order number or what you paid. We keep a private
          link between a shared price and your account only to stop abuse, and remove that link
          if you delete your account.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-extrabold">Services we use</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          {HELPERS.map(([name, job]) => (
            <li key={name}>
              <strong>{name}</strong> {job}
            </li>
          ))}
        </ul>
        <p className="mt-3">
          Our price checker visits public store pages to read prices. It doesn&apos;t send the
          store anything about you.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-extrabold">Your choices</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>Change your name, phone number or email settings in your account.</li>
          <li>Turn off all emails with one checkbox.</li>
          <li>Download everything we keep about you as one file.</li>
          <li>
            Delete your account. Your profile, purchases and price history are deleted right
            away and can&apos;t be brought back.
          </li>
        </ul>
        <Link href="/account" className="btn mt-5">
          Go to my account
        </Link>
      </section>

      <section>
        <h2 className="font-display text-2xl font-extrabold">Questions</h2>
        <p className="mt-3">
          PriceDrop Buddy is a free project built in the open. Ask anything by opening an issue
          on{" "}
          <a
            href="https://github.com/Sandhyal09/pricedrop-buddy/issues"
            className="font-semibold underline"
          >
            our GitHub page
          </a>
          . Don&apos;t include personal details there, because issues are public.
        </p>
      </section>
    </article>
  );
}
