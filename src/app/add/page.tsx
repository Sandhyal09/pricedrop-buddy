import type { Metadata } from "next";
import { addPurchase } from "@/app/actions";
import { STORES, todayString } from "@/lib/stores";
import { Message, SetupNotice } from "@/components/notices";

export const metadata: Metadata = { title: "Add a purchase – PriceDrop Buddy™" };

export default async function AddPage(props: PageProps<"/add">) {
  const { error } = await props.searchParams;
  const today = todayString();

  return (
    <div className="mx-auto max-w-xl">
      <SetupNotice />
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Add a purchase</h1>
      <p className="mt-2 text-ink-soft">
        Copy the details from your receipt or order email.
      </p>

      <div className="mt-6">
        <Message error={error} />
      </div>

      <form
        action={addPurchase}
        className="receipt space-y-4 p-6"
      >
        <div>
          <label htmlFor="product_name" className="label">
            What did you buy? *
          </label>
          <input
            id="product_name"
            name="product_name"
            required
            placeholder="e.g. 50-inch TV"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="store" className="label">
            Store *
          </label>
          <select id="store" name="store" required className="input" defaultValue="">
            <option value="" disabled>
              Choose a store
            </option>
            {STORES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.windowDays ? ` (${s.windowDays} days to claim)` : ""}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="rounded-lg border-2 border-dashed border-ink/25 p-4">
          <legend className="px-1 text-sm text-ink-soft">
            Only if you chose &quot;Other store&quot;
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="custom_store" className="label">
                Store name
              </label>
              <input id="custom_store" name="custom_store" className="input" />
            </div>
            <div>
              <label htmlFor="custom_window_days" className="label">
                Days to claim a price drop
              </label>
              <input
                id="custom_window_days"
                name="custom_window_days"
                type="number"
                min={1}
                max={365}
                className="input"
              />
            </div>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price_paid" className="label">
              Price you paid ($) *
            </label>
            <input
              id="price_paid"
              name="price_paid"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="299.99"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="purchase_date" className="label">
              Purchase date *
            </label>
            <input
              id="purchase_date"
              name="purchase_date"
              type="date"
              required
              max={today}
              defaultValue={today}
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="product_url" className="label">
            Product link (optional)
          </label>
          <input
            id="product_url"
            name="product_url"
            type="url"
            placeholder="https://www.target.com/p/..."
            className="input"
          />
        </div>

        <div>
          <label htmlFor="order_number" className="label">
            Order or receipt number (optional)
          </label>
          <input id="order_number" name="order_number" className="input" />
        </div>

        <button className="btn w-full py-3">Save purchase</button>
      </form>
    </div>
  );
}
