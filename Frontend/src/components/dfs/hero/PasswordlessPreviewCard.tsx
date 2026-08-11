import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GlassCard } from "./GlassCard";
import { AkInput } from "./HeroForms";
import { useDfs } from "@/lib/core/store";
import { OtpInput } from "../OtpInput";

export function PasswordlessPreviewCard({ isActive = true }: { isActive?: boolean }) {
  const { otpRequest, otpVerify } = useDfs();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleOtpRequest = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
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
        <p style={{ fontSize: 12, color: "var(--ak-moon)", marginTop: 4 }}>
          {otpSent ? `We sent a code to ${email}` : "Enter your email"}
        </p>
      </div>

      {!otpSent ? (
        <form onSubmit={handleOtpRequest} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AkInput
            label="Email address"
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
            {busy ? "Sending..." : "Send Login Code"}
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <OtpInput
            onComplete={handleOtpComplete}
            disabled={busy}
            onResend={() => void handleOtpRequest()}
            resendCooldown={60}
            compact
          />
          <button
            type="button"
            onClick={() => setOtpSent(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--ak-moon)",
              fontSize: 12,
              cursor: "pointer",
              marginTop: 8,
              textAlign: "center"
            }}
          >
            ← Use a different email
          </button>
        </div>
      )}
    </GlassCard>
  );
}
