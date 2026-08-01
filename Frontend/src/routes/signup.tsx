/**
 * ──────────────────────────────────────────────────
 * signup.tsx  —  SIGN UP PAGE  (URL: /signup)
 * ──────────────────────────────────────────────────
 * Registration form: name, email, password (with
 * strength indicator), confirm password. Redirects
 * to /dashboard on success.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/dfs/Logo";
import { Button } from "@/components/dfs/Button";
import { Field, PasswordField, PasswordStrength } from "@/components/dfs/Field";
import { useDfs } from "@/lib/dfs/store";
import { toast } from "sonner";

const title = "Create your DFS account";
const description = "Sign up for DFS to upload, encrypt and distribute files across storage nodes.";

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
  const { signUp, user } = useDfs();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/dashboard" });
  }, [user, navigate]);

  return (
    <main className="mesh flex min-h-screen items-center justify-center px-6 py-16">
      <form
        className="animate-rise w-full max-w-[420px]"
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
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="text-foreground">
            <Logo />
          </Link>
          <h1 className="mt-8 text-[30px] font-normal tracking-[-0.01em]">Create your account</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Start distributing files in under a minute
          </p>
        </div>

        <div className="mt-10 space-y-4">
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

        <Button type="submit" size="lg" full className="mt-6" disabled={busy}>
          {busy ? "Creating account…" : "Create Account"}
        </Button>

        <div className="my-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[12px] text-faint">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="text-center text-[14px] text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="text-foreground underline-offset-4 hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </main>
  );
}
