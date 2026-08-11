import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GlassCard } from "./GlassCard";
import { AkInput } from "./HeroForms";

export function PasswordlessPreviewCard({ isActive = true }: { isActive?: boolean }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    if (code.length < 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      toast.success("Code verified!");
      void navigate({ to: "/dashboard" });
    }, 1000);
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
          Sign in with OTP
        </p>
        <p style={{ fontSize: 12, color: "var(--ak-moon)", marginTop: 4 }}>Enter your email</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <AkInput
          label="Email address"
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <label
            style={{ fontSize: 12, color: "var(--ak-moon)", display: "block", marginBottom: 6 }}
          >
            Code
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              style={{
                width: "100%",
                letterSpacing: 8,
                textAlign: "center",
                fontSize: 20,
                padding: "12px",
                borderRadius: 8,
                background: "rgba(199,211,234,0.06)",
                boxShadow: "rgba(186,215,247,0.12) 0px 0px 0px 1px inset",
                color: "#d8ecf8",
                fontFamily: "var(--font-mono)",
                outline: "none",
                border: "none",
              }}
              placeholder="000000"
            />
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ak-fog)", marginTop: 8 }}>
          Resend code
        </p>
        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "11px 0",
            borderRadius: 6,
            background: busy ? "rgba(199,211,234,0.03)" : "rgba(199,211,234,0.06)",
            boxShadow: "rgba(186,215,247,0.12) 0px 0px 0px 1px inset",
            color: "#d1e4fa",
            fontWeight: 500,
            fontSize: 14,
            border: "none",
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          {busy ? "Verifying..." : "Verify code"}
        </button>
      </form>
    </GlassCard>
  );
}
