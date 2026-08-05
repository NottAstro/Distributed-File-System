/**
 * ──────────────────────────────────────────────────
 * signin.tsx  —  SIGN IN PAGE  (URL: /signin)
 * ──────────────────────────────────────────────────
 * Email + password login form. On success, redirects
 * to /dashboard. Uses the DFS store for auth state.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/dfs/Logo";
import { Button } from "@/components/dfs/Button";
import { Field, PasswordField } from "@/components/dfs/Field";
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

function SignInPage() {
  const { signIn, user } = useDfs();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/dashboard" });
  }, [user, navigate]);

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-16"
      style={{
        background: "#05060f",
      }}
    >
      <div className="ak-grid absolute inset-0 z-0 opacity-50" />

      <form
        className="ak-glass-card relative z-10 w-full max-w-[420px] p-8"
        style={{
          animation: "float 6s ease-in-out infinite",
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await signIn(email, password);
            void navigate({ to: "/dashboard" });
          } catch {
            toast.error("Could not sign in");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="text-foreground">
            <Logo />
          </Link>
          <h1 className="ak-gradient-text mt-8 text-[30px] font-medium tracking-tight">Welcome back</h1>
          <p className="mt-2 text-[15px] text-[var(--ak-moon)]">
            Sign in to access your distributed files
          </p>
        </div>

        <div className="mt-10 space-y-4">
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
            <button
              type="button"
              onClick={() => toast("Password reset is not wired up yet")}
              className="text-[13px] text-faint transition-colors duration-200 hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <Button variant="authSubmit" type="submit" size="lg" full className="mt-6" disabled={busy}>
          {busy ? "Signing in…" : "Sign In"}
        </Button>

        <div className="my-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[12px] text-faint">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="text-center text-[14px] text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </main>
  );
}
