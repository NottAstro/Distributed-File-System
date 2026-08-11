/**
 * ──────────────────────────────────────────────────
 * reset-password.tsx  —  RESET PASSWORD  (URL: /reset-password?token=xxx)
 * ──────────────────────────────────────────────────
 * User clicks the reset link from email → lands here.
 * Enter new password → verify token → update password → auto-login.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/dfs/Logo";
import { Button } from "@/components/dfs/Button";
import { PasswordField, PasswordStrength } from "@/components/dfs/Field";
import { useDfs } from "@/lib/core/store";
import { toast } from "sonner";

const title = "Set New Password — upLoader";
const description = "Choose a new password for your upLoader account.";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { resetPassword } = useDfs();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract token from URL search params
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const token = searchParams.get("token");

  // No token → show error
  if (!token) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6 py-16"
        style={{ background: "#05060f" }}
      >
        <div className="ak-grid absolute inset-0 z-0 opacity-50" />
        <div
          className="ak-glass-card relative z-10 w-full max-w-[420px] p-8 text-center"
          style={{ animation: "float 6s ease-in-out infinite" }}
        >
          <Link to="/" className="text-foreground">
            <Logo />
          </Link>
          <div className="mt-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="mt-6 text-xl font-medium text-foreground">Invalid Reset Link</h1>
            <p className="mt-2 text-[14px] text-faint">
              This password reset link is missing or malformed. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-block text-[14px] text-[#818cf8] transition-colors hover:text-[#a5b4fc]"
            >
              Request new reset link →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(token, password);
      toast.success("Password reset successful! You're now logged in.");
      void navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err?.message || "Invalid or expired reset link. Please request a new one.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-16"
      style={{ background: "#05060f" }}
    >
      <div className="ak-grid absolute inset-0 z-0 opacity-50" />

      <div
        className="ak-glass-card relative z-10 w-full max-w-[420px] p-8"
        style={{ animation: "float 6s ease-in-out infinite" }}
      >
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="text-foreground">
            <Logo />
          </Link>
          <h1 className="ak-gradient-text mt-8 text-[30px] font-medium tracking-tight">
            Set new password
          </h1>
          <p className="mt-2 text-[15px] text-[var(--ak-moon)]">
            Choose a strong password for your account
          </p>
        </div>

        <form className="mt-10" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <PasswordField
                label="New Password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
              />
              <PasswordStrength value={password} />
            </div>
            <PasswordField
              label="Confirm Password"
              required
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-[13px] text-red-400">{error}</p>
            </div>
          )}

          <Button
            variant="authSubmit"
            type="submit"
            size="lg"
            full
            className="mt-6"
            disabled={busy}
          >
            {busy ? "Resetting…" : "Reset Password"}
          </Button>
        </form>

        {/* ── Footer ── */}
        <div className="mt-7">
          <p className="text-center text-[14px] text-muted-foreground">
            Link expired?{" "}
            <Link to="/forgot-password" className="text-foreground underline-offset-4 hover:underline">
              Request a new one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
