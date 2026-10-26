/**
 * ──────────────────────────────────────────────────
 * settings.tsx  —  SETTINGS PAGE  (URL: /dashboard/settings)
 * ──────────────────────────────────────────────────
 * Profile and account info. Actions without a backend
 * endpoint yet are shown as "Coming soon" instead of
 * pretending to succeed.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, LogOut } from "lucide-react";
import { AppShell } from "@/components/dfs/AppShell";
import { StorageMeter } from "@/components/dfs/StorageMeter";
import { useDfs } from "@/lib/core/store";
import { initials } from "@/lib/core/format";

const title = "Settings — DFS";
const description = "Your DFS profile, sign-in method and storage.";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SettingsPage,
});

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl border p-5"
      style={{ borderColor: "rgba(186,215,247,0.07)", background: "rgba(199,211,234,0.025)" }}
    >
      <h2 className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--ak-fog)]">
        {label}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-[var(--ak-fog)]">{label}</p>
        <p className="truncate text-[15px] text-white">{value}</p>
      </div>
      {action}
    </div>
  );
}

function Soon() {
  return (
    <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[var(--ak-fog)]">
      Coming soon
    </span>
  );
}

function SettingsPage() {
  const { user, storage, signOut } = useDfs();
  if (!user) return <AppShell title="Settings">{null}</AppShell>;

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-[720px] space-y-4">
        <Section label="Profile">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="size-14 rounded-full object-cover"
              />
            ) : (
              <span
                className="flex size-14 items-center justify-center rounded-full font-mono text-[16px] text-white"
                style={{ background: "linear-gradient(135deg,#663af3,#2dd4bf)" }}
              >
                {initials(user.name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[17px] text-white">{user.name}</p>
              <p className="truncate text-[13px] text-[var(--ak-fog)]">{user.email}</p>
            </div>
          </div>
          <Row label="Display name" value={user.name} action={<Soon />} />
        </Section>

        <Section label="Sign-in & security">
          <Row
            label="Sign-in method"
            value={
              user.authProvider === "google" ? "Google account" : "Email and password · email code"
            }
          />
          <Row
            label="Password"
            value="Reset it with a link sent to your email"
            action={
              <Link
                to="/forgot-password"
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-white/[0.09] px-3 text-[13px] text-[var(--ak-moon)] hover:bg-white/[0.04] hover:text-white"
              >
                <KeyRound className="size-3.5" /> Reset
              </Link>
            }
          />
          <Row
            label="Two-factor authentication"
            value="Authenticator app (TOTP)"
            action={<Soon />}
          />
        </Section>

        <Section label="Storage">
          {storage && (
            <StorageMeter usedBytes={storage.usedBytes} quotaBytes={storage.quotaBytes} />
          )}
        </Section>

        <Section label="Account">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void signOut()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.09] px-4 text-[14px] text-[var(--ak-moon)] hover:bg-white/[0.04] hover:text-white"
            >
              <LogOut className="size-4" /> Sign out
            </button>
            <span className="text-[13px] text-[var(--ak-fog)]">Account deletion — coming soon</span>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
