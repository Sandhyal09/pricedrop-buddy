import Link from "next/link";
import { STORES } from "@/lib/stores";
import { SetupNotice } from "@/components/notices";

const STEPS = [
  {
    title: "Add what you bought",
    body: "Type in the item, store, price and date. Receipt scanning is coming next.",
  },
  {
    title: "We count down the days",
    body: "Every store gives a different number of days to claim a lower price. We track each one.",
  },
  {
    title: "Claim the difference",
    body: "Before your window closes, we show exactly how to ask that store for your money back.",
  },
];

export default function Home() {
  const stores = STORES.filter((s) => s.windowDays !== null);

  return (
    <div>
      <SetupNotice />

      {/* Hero */}
      <section className="grid items-center gap-10 py-4 md:grid-cols-[1.1fr_0.9fr] md:py-10">
        <div>
          <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-ink sm:text-6xl">
            The price dropped. Get the difference back.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            Target, Best Buy, Home Depot and Costco refund the difference when
            a price falls soon after you buy. You only get 14 to 30 days.
            PriceDrop Buddy counts them down so you never miss one.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn px-6 py-3 text-lg">
              Start tracking free
            </Link>
            <Link href="/dashboard" className="btn-ghost px-6 py-3 text-lg">
              My purchases
            </Link>
          </div>
        </div>

        <ReceiptDemo />
      </section>

      {/* How it works: a real sequence, so it's numbered */}
      <section className="mt-16" aria-labelledby="how">
        <h2 id="how" className="font-display text-3xl font-extrabold tracking-tight">
          How it works
        </h2>
        <ol className="mt-6 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-4 border-ink pt-4">
              <span className="font-display text-5xl font-extrabold text-markdown">
                {i + 1}
              </span>
              <h3 className="mt-1 text-xl font-bold">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Store windows as price tags */}
      <section className="mt-16" aria-labelledby="stores">
        <h2 id="stores" className="font-display text-3xl font-extrabold tracking-tight">
          How long each store gives you
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {stores.map((s) => (
            <li key={s.id} className="flex items-start gap-4 rounded-lg bg-paper p-4">
              <span className="tag tag-open text-lg">{s.windowDays} days</span>
              <div>
                <p className="text-lg font-bold">{s.name}</p>
                <p className="text-sm leading-relaxed text-ink-soft">{s.note}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-ink-soft">
          Shopping somewhere else? Choose &quot;Other store&quot; and type in
          its window.
        </p>
      </section>
    </div>
  );
}

/** The signature moment: a receipt whose price drops, then a refund stamp lands. */
function ReceiptDemo() {
  return (
    <figure className="relative mx-auto mb-12 w-full max-w-sm -rotate-1">
      <div className="receipt px-6 pt-6 pb-8 font-receipt text-sm text-ink">
        <p className="text-center text-base font-semibold">TARGET</p>
        <p className="text-center text-xs text-ink-soft">Purchased 11/03/2026</p>
        <hr className="my-4 border-t-2 border-dashed border-ink/30" />
        <div className="flex items-baseline justify-between gap-4">
          <span>50-in smart TV</span>
          <span className="strike">$299.99</span>
        </div>
        <div className="new-price mt-1 flex items-baseline justify-between gap-4 font-semibold text-markdown">
          <span>Price today</span>
          <span>$259.99</span>
        </div>
        <hr className="my-4 border-t-2 border-dashed border-ink/30" />
        <div className="flex justify-between">
          <span>Claim window</span>
          <span>14 days</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Claim by</span>
          <span>Nov 17</span>
        </div>
      </div>
      <div
        className="stamp absolute -right-4 -bottom-16 grid h-28 w-28 place-items-center rounded-full border-4 border-refund bg-paper/90 text-center font-display font-extrabold text-refund"
        aria-hidden="true"
      >
        <span className="leading-none">
          <span className="block text-3xl">$40</span>
          <span className="block text-lg">back</span>
        </span>
      </div>
      <figcaption className="sr-only">
        Example: a TV bought at Target for $299.99 drops to $259.99. Claiming
        before November 17 gets $40 back.
      </figcaption>
    </figure>
  );
}
