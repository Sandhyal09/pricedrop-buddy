import type { Metadata } from "next";
import { PasswordForm } from "@/components/account-forms";
import { PanelHeading } from "@/components/panel-heading";

export const metadata: Metadata = { title: "Password – PriceDrop Buddy™" };

export default function PasswordPage() {
  return (
    <>
      <PanelHeading title="Password">
        Pick a new password. You&apos;ll use it the next time you log in.
      </PanelHeading>
      <PasswordForm />
    </>
  );
}
