"use client";

import { useActionState, useState } from "react";
import {
  changePassword,
  deleteAccount,
  saveAlerts,
  saveDetails,
  type FormState,
} from "@/app/account/actions";

function Feedback({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p
        role="alert"
        className="rounded-lg border-2 border-markdown bg-markdown-soft px-4 py-3 text-sm font-medium text-ink"
      >
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p
        role="status"
        className="rounded-lg border-2 border-refund bg-refund-soft px-4 py-3 text-sm font-medium text-ink"
      >
        {state.message}
      </p>
    );
  return null;
}

export function DetailsForm({
  fullName,
  email,
  phone,
}: {
  fullName: string;
  email: string;
  phone: string;
}) {
  const [state, action, pending] = useActionState(saveDetails, {});
  return (
    <form action={action} noValidate className="space-y-5">
      <Feedback state={state} />
      <div>
        <label htmlFor="full_name" className="label">
          Your name
        </label>
        <input
          id="full_name"
          name="full_name"
          autoComplete="name"
          maxLength={80}
          defaultValue={fullName}
          placeholder="e.g. Sandhya"
          className="input"
        />
        <p className="mt-1 text-sm text-ink-soft">Used to greet you. Other shoppers never see it.</p>
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          value={email}
          readOnly
          aria-describedby="email-hint"
          className="input cursor-not-allowed bg-ground text-ink-soft"
        />
        <p id="email-hint" className="mt-1 text-sm text-ink-soft">
          This is how you log in, so it can&apos;t be changed here.
        </p>
      </div>
      <div>
        <label htmlFor="phone" className="label">
          Phone number (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={phone}
          placeholder="(555) 123-4567"
          className="input"
        />
        <p className="mt-1 text-sm text-ink-soft">
          Only you can see it. We don&apos;t send texts yet, and we never share it.
        </p>
      </div>
      <button className="btn px-5 py-2.5" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

export function AlertsForm({ emailAlerts }: { emailAlerts: boolean }) {
  const [state, action, pending] = useActionState(saveAlerts, {});
  const [on, setOn] = useState(emailAlerts);
  return (
    <form action={action} className="space-y-5">
      <Feedback state={state} />
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border-2 border-ink bg-paper p-4">
        <span>
          <span className="block font-bold">Email alerts</span>
          <span className="block text-sm text-ink-soft">
            {on ? "On: you'll hear from us when it matters." : "Off: we won't email you."}
          </span>
        </span>
        <input
          type="checkbox"
          name="email_alerts"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative h-8 w-14 shrink-0 rounded-full border-2 border-ink bg-ground transition-colors peer-checked:bg-refund peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:border-2 after:border-ink after:bg-paper after:transition-transform peer-checked:after:translate-x-6"
        />
      </label>
      <ul className="space-y-2 text-sm">
        {[
          "A reminder 3 days and 1 day before a refund window closes",
          "An email when our price checker sees a lower price",
          "Price Radar alerts when another shopper spots a lower price",
        ].map((item) => (
          <li key={item} className={`flex gap-2 ${on ? "" : "text-ink-soft line-through"}`}>
            <span aria-hidden="true" className={on ? "text-refund" : ""}>
              {on ? "✓" : "–"}
            </span>
            {item}
          </li>
        ))}
      </ul>
      <button className="btn px-5 py-2.5" disabled={pending}>
        {pending ? "Saving…" : "Save email settings"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} noValidate className="space-y-4">
      <Feedback state={state} />
      <div>
        <label htmlFor="password" className="label">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="input"
        />
        <p className="mt-1 text-sm text-ink-soft">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          Type it again
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" />
      </div>
      <button className="btn px-5 py-2.5" disabled={pending}>
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}

export function DeleteForm({ purchaseCount }: { purchaseCount: number }) {
  const [state, action, pending] = useActionState(deleteAccount, {});
  const [typed, setTyped] = useState("");
  return (
    <form action={action} noValidate className="space-y-4">
      <Feedback state={state} />
      <p>
        This deletes your account, your profile and{" "}
        <strong>
          {purchaseCount} saved purchase{purchaseCount === 1 ? "" : "s"}
        </strong>{" "}
        with their price history. It can&apos;t be undone.
      </p>
      <div>
        <label htmlFor="delete-confirm" className="label">
          Type DELETE to confirm
        </label>
        <input
          id="delete-confirm"
          name="confirm"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="input"
        />
      </div>
      <button
        className="inline-flex items-center justify-center rounded-lg border-2 border-ink bg-markdown px-5 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending || typed !== "DELETE"}
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
