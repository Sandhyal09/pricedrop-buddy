import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export async function Header() {
  const user = isSupabaseConfigured ? await getUser() : null;

  return (
    <header className="border-b-2 border-ink bg-sticker">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-ink" aria-label="PriceDrop Buddy home">
          <Logo />
          {/* On phones, logged-in users see just the logo so the menu fits. */}
          <span
            className={`font-display text-xl font-extrabold tracking-tight whitespace-nowrap ${user ? "max-sm:sr-only" : ""}`}
          >
            PriceDrop Buddy<span className="align-super text-xs">™</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm whitespace-nowrap sm:gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="font-semibold text-ink hover:underline">
                My purchases
              </Link>
              <Link href="/scan" className="btn hidden px-3 py-1.5 text-sm sm:inline-flex">
                Scan receipt
              </Link>
              <Link href="/account" className="font-semibold text-ink hover:underline">
                Account
              </Link>
              <form action={signOut}>
                <button className="font-semibold text-ink hover:underline">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login?mode=login" className="font-semibold text-ink hover:underline">
                Log in
              </Link>
              <Link href="/login" className="btn px-3 py-1.5 text-sm">
                Sign up free
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

/** A price tag with a downward arrow. */
function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M3 16 L12 5 H29 V27 H12 Z"
        fill="#ffffff"
        stroke="#1d1a4f"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="16" r="2" fill="#1d1a4f" />
      <path
        d="M21 10 V21 M17 17.5 L21 21.5 L25 17.5"
        fill="none"
        stroke="#e4252f"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
