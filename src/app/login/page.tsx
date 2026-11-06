import type { Metadata } from "next";
import { signIn, signUp } from "@/app/actions";
import { Message, SetupNotice } from "@/components/notices";

export const metadata: Metadata = { title: "Log in – PriceDrop Buddy™" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error, message } = await props.searchParams;

  return (
    <div className="mx-auto max-w-md">
      <SetupNotice />
      <h1 className="text-2xl font-bold">Welcome to PriceDrop Buddy</h1>
      <p className="mt-1 text-neutral-600">
        Log in, or create a free account with your email.
      </p>

      <div className="mt-6">
        <Message error={error} info={message} />
      </div>

      <form className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password (at least 8 characters)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="input"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button formAction={signIn} className="btn flex-1">
            Log in
          </button>
          <button formAction={signUp} className="btn-outline flex-1">
            Create free account
          </button>
        </div>
      </form>
    </div>
  );
}
