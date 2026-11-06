"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/actions";

type Mode = "signup" | "login";

export function AuthForm({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Choose sign up or log in"
        className="mb-6 grid grid-cols-2 rounded-full border-2 border-ink bg-paper p-1"
      >
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full py-2 font-semibold transition-colors ${
              mode === m ? "bg-ink text-paper" : "text-ink hover:bg-sticker"
            }`}
          >
            {m === "signup" ? "Create account" : "Log in"}
          </button>
        ))}
      </div>
      {/* A separate form per mode, so each keeps its own messages. */}
      {mode === "signup" ? (
        <ModeForm key="signup" mode="signup" />
      ) : (
        <ModeForm key="login" mode="login" />
      )}
    </div>
  );
}

function ModeForm({ mode }: { mode: Mode }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "signup" ? signUp : signIn,
    {},
  );

  if (state.message) {
    return (
      <div className="rounded-xl border-2 border-refund bg-refund-soft p-5 text-ink" role="status">
        <p className="text-lg font-bold">Check your inbox</p>
        <p className="mt-2">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border-2 border-markdown bg-markdown-soft px-4 py-3 text-sm font-medium text-ink"
        >
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor={`${mode}-email`} className="label">
          Email
        </label>
        <input
          id={`${mode}-email`}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          className="input"
        />
      </div>
      <div>
        <label htmlFor={`${mode}-password`} className="label">
          Password
        </label>
        <input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          aria-describedby={mode === "signup" ? "password-hint" : undefined}
          className="input"
        />
        {mode === "signup" && (
          <p id="password-hint" className="mt-1 text-sm text-ink-soft">
            At least 8 characters.
          </p>
        )}
      </div>
      <button className="btn w-full py-3 text-lg" disabled={pending}>
        {pending
          ? mode === "signup"
            ? "Creating your account…"
            : "Logging in…"
          : mode === "signup"
            ? "Create free account"
            : "Log in"}
      </button>
    </form>
  );
}
