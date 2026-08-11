/**
 * ──────────────────────────────────────────────────
 * signin.tsx  —  SIGN IN PAGE  (URL: /signin)
 * ──────────────────────────────────────────────────
 * Three login methods:
 * 1. Email + Password (default)
 * 2. OTP via email
 * 3. Google Sign-In
 * Plus "Forgot password?" link → /forgot-password
 * ──────────────────────────────────────────────────
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/dfs/Logo";
import { Button } from "@/components/dfs/Button";
import { Field, PasswordField } from "@/components/dfs/Field";
import { GoogleSignInButton } from "@/components/dfs/GoogleSignInButton";
import { OtpInput } from "@/components/dfs/OtpInput";
import { useDfs } from "@/lib/core/store";
import { toast } from "sonner";

const title = "Sign in — upLoader";
const description = "Sign in to access your distributed files on upLoader.";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SignInPage,
});

type AuthTab = "password" | "otp";

function SignInPage() {
  const { signIn, googleSignIn, otpRequest, otpVerify, user } = useDfs();
  const navigate = useNavigate();

  // Shared state
  const [tab, setTab] = useState<AuthTab>("password");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  // Password tab state
  const [password, setPassword] = useState("");

  // OTP tab state
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/dashboard" });
  }, [user, navigate]);

  /* ── Google login handler ── */
  const handleGoogleCredential = async (credential: string) => {
    setBusy(true);
    try {
      await googleSignIn(credential);
      void navigate({ to: "/dashboard" });
    } catch {
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ── OTP request handler ── */
  const handleOtpRequest = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    setBusy(true);
    try {
      await otpRequest(email);
      setOtpSent(true);
      toast.success("Login code sent! Check your email.");
    } catch {
      toast.error("Could not send login code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ── OTP verify handler ── */
  const handleOtpComplete = async (code: string) => {
    setBusy(true);
    try {
      await otpVerify(email, code);
      void navigate({ to: "/dashboard" });
    } catch {
      toast.error("Invalid or expired code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-16"
      style={{
        background: "#05060f",
      }}
    >
      <div className="ak-grid absolute inset-0 z-0 opacity-50" />

      <div
        className="ak-glass-card relative z-10 w-full max-w-[420px] p-8"
        style={{
          animation: "float 6s ease-in-out infinite",
        }}
      >
        {/* ── Header ── */}
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="text-foreground">
            <Logo />
          </Link>
          <h1 className="ak-gradient-text mt-8 text-[30px] font-medium tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-[15px] text-[var(--ak-moon)]">
            Sign in to access your distributed files
          </p>
        </div>

        {/* ── Google Sign-In ── */}
        <div className="mt-8">
          <GoogleSignInButton onCredential={handleGoogleCredential} disabled={busy} />
        </div>

        {/* ── Divider ── */}
        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[12px] text-faint">or continue with email</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* ── Tab switcher ── */}
        <div className="mb-6 flex rounded-lg border border-[var(--ak-glass-border)] bg-[var(--ak-glass)] p-1">
          <button
            type="button"
            onClick={() => { setTab("password"); setOtpSent(false); }}
            className={`flex-1 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
              tab === "password"
                ? "bg-[#818cf8]/15 text-[#818cf8] shadow-sm"
                : "text-faint hover:text-foreground"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setTab("otp")}
            className={`flex-1 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
              tab === "otp"
                ? "bg-[#818cf8]/15 text-[#818cf8] shadow-sm"
                : "text-faint hover:text-foreground"
            }`}
          >
            Email Code
          </button>
        </div>

        {/* ── Password Tab ── */}
        {tab === "password" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await signIn(email, password);
                void navigate({ to: "/dashboard" });
              } catch {
                toast.error("Invalid email or password");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-4">
              <Field
                label="Email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PasswordField
                label="Password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-[13px] text-faint transition-colors duration-200 hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button variant="authSubmit" type="submit" size="lg" full className="mt-6" disabled={busy}>
              {busy ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        )}

        {/* ── OTP Tab ── */}
        {tab === "otp" && (
          <div>
            {!otpSent ? (
              /* Step 1: Enter email → Send OTP */
              <div className="space-y-4">
                <Field
                  label="Email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  variant="authSubmit"
                  type="button"
                  size="lg"
                  full
                  disabled={busy || !email}
                  onClick={handleOtpRequest}
                >
                  {busy ? "Sending…" : "Send Login Code"}
                </Button>
              </div>
            ) : (
              /* Step 2: Enter OTP code */
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-[14px] text-[var(--ak-moon)]">
                    We sent a 6-digit code to
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-foreground">{email}</p>
                </div>

                <OtpInput
                  onComplete={handleOtpComplete}
                  disabled={busy}
                  onResend={handleOtpRequest}
                  resendCooldown={60}
                />

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="mx-auto block text-[13px] text-faint transition-colors hover:text-foreground"
                >
                  ← Use a different email
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-7">
          <p className="text-center text-[14px] text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
