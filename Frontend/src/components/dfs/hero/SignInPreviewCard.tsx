import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Chrome, Github } from "lucide-react";
import { useDfs } from "@/lib/core/store";
import { toast } from "sonner";
import { GlassCard } from "./GlassCard";
import { AkInput, AkPasswordInput, OrDivider, SocialButton } from "./HeroForms";

export function SignInPreviewCard({ isActive = true }: { isActive?: boolean }) {
  const { signIn } = useDfs();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      void navigate({ to: "/dashboard" });
    } catch {
      toast.error("Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard
      isActive={isActive}
      style={{
        width: 300,
        flexShrink: 0,
        transformOrigin: "center center",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: 18,
            background: "linear-gradient(0deg, #d8ecf8 0%, #98c0ef 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          upLoader
        </span>
      </div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#d8ecf8",
            fontFamily: "var(--font-display)",
          }}
        >
          Welcome back
        </p>
        <p style={{ fontSize: 12, color: "var(--ak-moon)", marginTop: 4 }}>
          Sign in to your account
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SocialButton icon={<Chrome size={14} />} label="Continue with Google" />
        <SocialButton icon={<Github size={14} />} label="Continue with GitHub" />
      </div>
      <OrDivider />
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <AkInput
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AkPasswordInput
          label="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: 4,
            width: "100%",
            padding: "11px 0",
            borderRadius: 6,
            background: busy ? "rgba(102,58,243,0.5)" : "#663af3",
            color: "#fff",
            fontWeight: 500,
            fontSize: 14,
            border: "none",
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          {busy ? "Signing in..." : "Continue →"}
        </button>
      </form>
    </GlassCard>
  );
}
