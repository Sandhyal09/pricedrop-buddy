import Link from "next/link";
import { STORES } from "@/lib/stores";
import { SetupNotice } from "@/components/notices";

const STEPS = [
  {
    title: "Add what you bought",
    body: "Type in a purchase (receipt scanning is coming next). Takes 30 seconds.",
  },
  {
    title: "We count down the days",
    body: "Each store gives a limited time to refund a price drop. We track every deadline for you.",
  },
  {
    title: "Claim your money back",
    body: "Before time runs out, we remind you and show exactly how to claim at that store.",
  },
];

export default function Home() {
  const stores = STORES.filter((s) => s.windowDays !== null);

  return (
    <div>
      <SetupNotice />

      <section className="py-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Never miss a price-drop refund again.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
          Stores like Target and Best Buy refund the difference when a price
          drops after you buy, but only for a few days. PriceDrop Buddy tracks
          every deadline for you, for free.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login" className="btn px-6 py-3 text-lg">
            Sign up free
          </Link>
          <Link href="/dashboard" className="btn-outline px-6 py-3 text-lg">
            My purchases
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="rounded-xl border border-neutral-200 bg-white p-5"
          >
            <p className="text-sm font-semibold text-brand">Step {i + 1}</p>
            <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 text-neutral-600">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Stores we track</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-2">Store</th>
                <th className="px-4 py-2">Days to claim a price drop</th>
                <th className="hidden px-4 py-2 sm:table-cell">Good to know</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2">{s.windowDays} days</td>
                  <td className="hidden px-4 py-2 text-neutral-600 sm:table-cell">
                    {s.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Shopping somewhere else? Choose &quot;Other store&quot; and enter its
          window yourself.
        </p>
      </section>
    </div>
  );
}
