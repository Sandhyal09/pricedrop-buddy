import { isSupabaseConfigured } from "@/lib/supabase/config";

export function SetupNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="mb-6 rounded-lg border-2 border-ink bg-sticker-soft p-4 text-sm text-ink">
      <p className="font-bold">The database isn&apos;t connected yet.</p>
      <p className="mt-1">
        Sign-up and saving purchases will work after you add your Supabase
        keys. See &quot;Connect the database&quot; in the README.
      </p>
    </div>
  );
}

export function Message({
  error,
  info,
}: {
  error?: string | string[];
  info?: string | string[];
}) {
  const e = Array.isArray(error) ? error[0] : error;
  const i = Array.isArray(info) ? info[0] : info;
  if (e) {
    return (
      <p
        role="alert"
        className="mb-4 rounded-lg border-2 border-markdown bg-markdown-soft px-4 py-3 text-sm font-medium text-ink"
      >
        {e}
      </p>
    );
  }
  if (i) {
    return (
      <p
        role="status"
        className="mb-4 rounded-lg border-2 border-refund bg-refund-soft px-4 py-3 text-sm font-medium text-ink"
      >
        {i}
      </p>
    );
  }
  return null;
}
