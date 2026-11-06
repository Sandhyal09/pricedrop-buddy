import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Message, SetupNotice } from "@/components/notices";

export const metadata: Metadata = { title: "Sign up or log in – PriceDrop Buddy™" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error, mode } = await props.searchParams;

  return (
    <div className="mx-auto max-w-md">
      <SetupNotice />
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
        {mode === "login" ? "Welcome back" : "Start catching price drops"}
      </h1>
      <p className="mt-2 text-ink-soft">
        Free. Your purchases stay private to your account.
      </p>
      <div className="mt-6">
        <Message error={error} />
      </div>
      <div className="receipt mt-2 p-6">
        <AuthForm initialMode={mode === "login" ? "login" : "signup"} />
      </div>
    </div>
  );
}
