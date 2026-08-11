import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useDfs } from "@/lib/core/store";
import { toast } from "sonner";
import { GlassCard } from "./GlassCard";
import { AkInput, AkPasswordInput, OrDivider } from "./HeroForms";
import { HeroGoogleButton } from "./HeroGoogleButton";

export function SignUpCard({ isActive = true }: { isActive?: boolean }) {
  const { signUp, googleSignIn } = useDfs();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await signUp(name, email, password);
      void navigate({ to: "/dashboard" });
    } catch {
      toast.error("Could not create account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard
      isActive={isActive}
      style={{
        width: 360,
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
        /* Extra outer glow on the center card */
        boxShadow:
          "rgba(216,236,248,0.2) 0px 1px 1px 0px inset, rgba(168,216,245,0.06) 0px 24px 48px 0px inset, rgba(0,0,0,0.4) 0px 24px 48px 0px, rgba(186,207,247,0.12) 0px 0px 48px 0px",
      }}
    >
      {/* Logo / wordmark */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: 20,
            background: "linear-gradient(0deg, #d8ecf8 0%, #98c0ef 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          upLoader
        </span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "#d8ecf8",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.01em",
          }}
        >
          Create your account
        </h2>
        <p style={{ fontSize: 13, color: "var(--ak-moon)", marginTop: 6 }}>
          Start distributing files in under a minute
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <AkInput
          label="Full Name"
          type="text"
          required
          placeholder="Ada Kovacs"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <AkInput
          label="Email address"
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AkPasswordInput
          label="Password"
          required
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          id="hero-signup-submit"
          disabled={busy}
          style={{
            marginTop: 4,
            width: "100%",
            padding: "12px 0",
            borderRadius: 6,
            background: busy ? "rgba(102,58,243,0.5)" : "#663af3",
            color: "#ffffff",
            fontWeight: 500,
            fontSize: 14,
            border: "none",
            cursor: busy ? "not-allowed" : "pointer",
            transition: "opacity 200ms ease, transform 100ms ease",
            fontFamily: "var(--font-sans)",
          }}
        >
          {busy ? "Creating account…" : "Create Account →"}
        </button>
      </form>

      <OrDivider />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <HeroGoogleButton onCredential={handleGoogleCredential} disabled={busy} label="Continue with Google" />
      </div>

      <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--ak-fog)" }}>
        Already have an account?{" "}
        <Link
          to="/signin"
          style={{ color: "var(--ak-frost)", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Sign in
        </Link>
      </p>
    </GlassCard>
  );
}
