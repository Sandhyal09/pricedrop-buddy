// Shared setup for the scheduled jobs: settings, database, email.
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export function need(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Add it in GitHub → Settings → Secrets and variables → Actions.`);
    process.exit(1);
  }
  return value;
}

export const dryRun = process.env.DRY_RUN === "true";
export const siteUrl = (process.env.SITE_URL?.trim() || "https://pricedrop-buddy.vercel.app").replace(/\/$/, "");

// The secret key can read every user's purchases, so it only ever lives
// in GitHub Secrets and is never sent to the website.
export const supabase = createClient(need("SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const gmailUser = dryRun ? process.env.GMAIL_USER ?? "" : need("GMAIL_USER");
const mailer = dryRun
  ? null
  : nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: need("GMAIL_APP_PASSWORD") },
    });

/** Confirmed email address for a user, or null. */
export async function emailFor(userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email || !data.user.email_confirmed_at) return null;
  return data.user.email;
}

/** Sends an email, or prints it in a dry run. Returns true if it went out. */
export async function send(
  to: string,
  message: { subject: string; text: string; html: string },
): Promise<boolean> {
  if (dryRun) {
    console.log(`\n--- Would email a user ---\nSubject: ${message.subject}\n\n${message.text}`);
    return false;
  }
  try {
    await mailer!.sendMail({
      from: `"PriceDrop Buddy" <${gmailUser}>`,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return true;
  } catch (err) {
    console.error("Sending failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
