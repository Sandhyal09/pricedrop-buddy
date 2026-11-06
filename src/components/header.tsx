import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export async function Header() {
  const user = isSupabaseConfigured ? await getUser() : null;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand">
          PriceDrop Buddy™
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="font-medium hover:underline">
                My purchases
              </Link>
              <Link href="/add" className="btn px-3 py-1.5 text-sm">
                + Add
              </Link>
              <form action={signOut}>
                <button className="text-neutral-600 hover:underline">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn px-3 py-1.5 text-sm">
              Log in / Sign up
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
