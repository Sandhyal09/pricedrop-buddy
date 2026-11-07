/**
 * Tidies a phone number: keeps a leading + and the digits.
 * Returns null for an empty value and false for a number that can't be right.
 */
export function cleanPhone(raw: string): string | null | false {
  const value = raw.trim();
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  return (value.startsWith("+") ? "+" : "") + digits;
}

/** Shows a 10-digit US number as (555) 123-4567; anything else as stored. */
export function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const us = phone.replace(/^\+?1(?=\d{10}$)/, "");
  return /^\d{10}$/.test(us) ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : phone;
}
