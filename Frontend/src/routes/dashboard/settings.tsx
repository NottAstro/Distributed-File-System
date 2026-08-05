/**
 * ──────────────────────────────────────────────────
 * settings.tsx  —  SETTINGS PAGE  (URL: /dashboard/settings)
 * ──────────────────────────────────────────────────
 * Sections: Profile (name/email), Security (change
 * password, 2FA toggle, active sessions), Storage
 * (usage meter), and Danger Zone (delete all / account).
 * ──────────────────────────────────────────────────
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/dfs/AppShell";
import { Button } from "@/components/dfs/Button";
import { Field, PasswordField } from "@/components/dfs/Field";
import { StorageMeter } from "@/components/dfs/StorageMeter";
import { useDfs } from "@/lib/core/store";
import { initials } from "@/lib/core/format";
import { MOCK_SESSIONS } from "@/lib/core/mock-data";
import { toast } from "sonner";

const title = "Settings — DFS";
const description = "Manage your DFS profile, security preferences, sessions and storage.";

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
    <section className="border-t border-border pt-8">
      <h2 className="text-overline text-faint">{label}</h2>
      <div className="mt-5 max-w-[440px] space-y-4">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { user, storage } = useDfs();
  const [name, setName] = useState(user?.name ?? "");
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessions, setSessions] = useState(MOCK_SESSIONS);

  return (
    <AppShell title="Settings">
      <div className="max-w-[720px] space-y-10 pb-10">
        <Section label="Profile">
          <div className="flex items-center gap-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface font-mono text-[13px]">
              {initials(name || "DFS")}
            </span>
            <span className="font-mono text-[12px] text-faint">Avatar uses your initials</span>
          </div>
          <Field label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Email" value={user?.email ?? ""} readOnly className="opacity-60" />
          {/* TODO(backend): PATCH /me */}
          <Button onClick={() => toast.success("Profile saved")}>Save Changes</Button>
        </Section>

        <Section label="Security">
          <PasswordField label="Current Password" placeholder="••••••••" />
          <PasswordField label="New Password" placeholder="••••••••" />
          <PasswordField label="Confirm New Password" placeholder="••••••••" />
          {/* TODO(backend): POST /auth/change-password */}
          <Button onClick={() => toast.success("Password updated")}>Update Password</Button>

          <div className="flex items-center justify-between border-t border-border pt-5">
            <div>
              <p className="text-[15px]">Two-Factor Authentication</p>
              <p className="font-mono text-[12px] text-faint">TOTP via authenticator app</p>
            </div>
            <button
              role="switch"
              aria-checked={twoFactor}
              aria-label="Toggle two-factor authentication"
              onClick={() => setTwoFactor((v) => !v)}
              className={`relative h-6 w-11 rounded-full border transition-colors duration-200 ${
                twoFactor ? "border-teal bg-teal/30" : "border-border bg-surface"
              }`}
            >
              <span
                className={`absolute top-[3px] size-4 rounded-full transition-all duration-200 ${
                  twoFactor ? "left-[25px] bg-teal" : "left-[3px] bg-faint"
                }`}
              />
            </button>
          </div>

          <div className="border-t border-border pt-5">
            <p className="text-[15px]">Active Sessions</p>
            <ul className="mt-3 space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px]">{s.device}</p>
                    <p className="font-mono text-[12px] text-faint">
                      {s.location} · {s.lastActive}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section label="Storage">
          {storage && (
            <StorageMeter usedBytes={storage.usedBytes} quotaBytes={storage.quotaBytes} />
          )}
          <button className="text-[14px] text-faint underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline">
            Request More Storage
          </button>
        </Section>

        <Section label="Danger Zone">
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={() => toast.error("Deleting all files is disabled in the demo")}>
              Delete All Files
            </Button>
            <Button variant="danger" onClick={() => toast.error("Account deletion is disabled in the demo")}>
              Delete Account
            </Button>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
