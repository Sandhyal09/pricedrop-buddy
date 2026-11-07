import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountNav } from "@/components/account-nav";
import { SetupNotice } from "@/components/notices";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.full_name?.trim();
  const initial = (name || user.email || "?").charAt(0).toUpperCase();
  const joined = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <SetupNotice />
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Account settings</h1>

      <div className="mt-8 grid items-start gap-6 md:grid-cols-[250px_1fr] md:gap-8">
        <aside className="space-y-5 md:sticky md:top-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-14 shrink-0 -rotate-6 place-items-center rounded-full border-2 border-ink bg-sticker font-display text-2xl font-extrabold text-ink shadow-[3px_3px_0_var(--color-ink)]"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{name || "Add your name"}</p>
              <p className="truncate text-sm text-ink-soft">{user.email}</p>
              <p className="text-xs text-ink-soft">Member since {joined}</p>
            </div>
          </div>
          <AccountNav />
        </aside>

        <section className="min-w-0 rounded-xl border-2 border-ink bg-paper p-6 shadow-[5px_5px_0_var(--color-ink)] sm:p-8">
          {children}
        </section>
      </div>
    </div>
  );
}
