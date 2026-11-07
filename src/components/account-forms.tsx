"use client";

import { useActionState, useState } from "react";
import {
  changePassword,
  deleteAccount,
  saveProfile,
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

export function ProfileForm({
  fullName,
  phone,
  emailAlerts,
}: {
  fullName: string;
  phone: string;
  emailAlerts: boolean;
}) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return (
    <form action={action} noValidate className="space-y-4">
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
      <label className="flex items-start gap-3 rounded-lg border-2 border-ink/15 bg-paper p-3">
        <input
          type="checkbox"
          name="email_alerts"
          defaultChecked={emailAlerts}
          className="mt-1 size-5 accent-ink"
        />
        <span>
          <span className="font-semibold">Email me</span> deadline reminders, price drops and
          Price Radar alerts
        </span>
      </label>
      <button className="btn px-5 py-2.5" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
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
