import { isSupabaseConfigured } from "@/lib/supabase/config";

export function SetupNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">The database isn&apos;t connected yet.</p>
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
      <p className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
        {e}
      </p>
    );
  }
  if (i) {
    return (
      <p className="mb-4 rounded-lg border border-teal-300 bg-teal-50 p-3 text-sm text-teal-900">
        {i}
      </p>
    );
  }
  return null;
}
