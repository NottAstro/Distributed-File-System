/**
 * ──────────────────────────────────────────────────
 * signup.tsx  —  SIGN UP PAGE  (URL: /signup)
 * ──────────────────────────────────────────────────
 * Registration form: name, email, password (with
 * strength indicator), confirm password. Plus Google
 * sign-up option. Redirects to /dashboard on success.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/dfs/Logo";
import { Button } from "@/components/dfs/Button";
import { Field, PasswordField, PasswordStrength } from "@/components/dfs/Field";
import { GoogleSignInButton } from "@/components/dfs/GoogleSignInButton";
import { useDfs } from "@/lib/core/store";
import { toast } from "sonner";

const title = "Create your upLoader account";
const description =
  "Sign up for upLoader to upload, encrypt and distribute files across storage nodes.";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { signUp, googleSignIn, user } = useDfs();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/dashboard" });
  }, [user, navigate]);

  /* ── Google sign-up handler ── */
  const handleGoogleCredential = async (credential: string) => {
    setBusy(true);
    try {
      await googleSignIn(credential);
      void navigate({ to: "/dashboard" });
    } catch {
      toast.error("Google sign-up failed. Please try again.");
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
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="text-foreground">
            <Logo />
          </Link>
          <h1 className="ak-gradient-text mt-8 text-[30px] font-medium tracking-tight">
            Create your account
          </h1>
          <p className="mt-2 text-[15px] text-[var(--ak-moon)]">
            Start distributing files in under a minute
          </p>
        </div>

        {/* ── Google Sign-Up ── */}
        <div className="mt-8">
          <GoogleSignInButton
            onCredential={handleGoogleCredential}
            disabled={busy}
            text="signup_with"
          />
        </div>

        {/* ── Divider ── */}
        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[12px] text-faint">or sign up with email</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (password !== confirm) {
              toast.error("Passwords do not match");
              return;
            }
            setBusy(true);
            try {
              await signUp(name, email, password);
              void navigate({ to: "/dashboard" });
            } catch {
              toast.error("Could not create account");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-4">
            <Field
              label="Full Name"
              required
              placeholder="Ada Kovacs"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Field
              label="Email"
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="space-y-2">
              <PasswordField
                label="Password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrength value={password} />
            </div>
            <PasswordField
              label="Confirm Password"
              required
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <Button variant="authSubmit" type="submit" size="lg" full className="mt-6" disabled={busy}>
            {busy ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <div className="mt-7">
          <p className="text-center text-[14px] text-muted-foreground">
            Already have an account?{" "}
            <Link to="/signin" className="text-foreground underline-offset-4 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
