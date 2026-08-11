/**
 * ──────────────────────────────────────────────────
 * forgot-password.tsx  —  FORGOT PASSWORD  (URL: /forgot-password)
 * ──────────────────────────────────────────────────
 * Enter email → receive reset link via email.
 * Always shows success (anti-enumeration).
 * ──────────────────────────────────────────────────
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/dfs/Logo";
import { Button } from "@/components/dfs/Button";
import { Field } from "@/components/dfs/Field";
import { useDfs } from "@/lib/core/store";
import { toast } from "sonner";

const title = "Forgot Password — upLoader";
const description = "Reset your upLoader password via email.";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { forgotPassword } = useDfs();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer for resend
  if (cooldown > 0) {
    setTimeout(() => setCooldown((c) => c - 1), 1000);
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    setBusy(true);
    try {
      await forgotPassword(email);
      setSent(true);
      setCooldown(60);
    } catch {
      toast.error("Something went wrong. Please try again.");
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
            Reset password
          </h1>
          <p className="mt-2 text-[15px] text-[var(--ak-moon)]">
            {sent
              ? "Check your email for a reset link"
              : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        {!sent ? (
          /* ── Email form ── */
          <form className="mt-10" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Field
                label="Email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button
              variant="authSubmit"
              type="submit"
              size="lg"
              full
              className="mt-6"
              disabled={busy}
            >
              {busy ? "Sending…" : "Send Reset Link"}
            </Button>
          </form>
        ) : (
          /* ── Success state ── */
          <div className="mt-10 space-y-6">
            {/* Email icon */}
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#818cf8]/10 ring-1 ring-[#818cf8]/20">
                <svg
                  className="h-8 w-8 text-[#818cf8]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[14px] text-[var(--ak-moon)]">
                We sent a reset link to
              </p>
              <p className="mt-1 text-[14px] font-medium text-foreground">{email}</p>
              <p className="mt-3 text-[13px] text-faint">
                The link expires in 15 minutes. Check your spam folder if you don't see it.
              </p>
            </div>

            {/* Resend button */}
            <div className="text-center">
              {cooldown > 0 ? (
                <span className="text-[13px] text-faint">
                  Resend in{" "}
                  <span className="font-mono text-foreground">
                    {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={busy}
                  className="text-[13px] text-[#818cf8] transition-colors hover:text-[#a5b4fc]"
                >
                  Resend reset link
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-7">
          <p className="text-center text-[14px] text-muted-foreground">
            Remember your password?{" "}
            <Link to="/signin" className="text-foreground underline-offset-4 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
