import { Lock, ShieldCheck, Users, Fingerprint, KeyRound, Zap } from "lucide-react";

export const FEATURES = [
  { icon: <Lock size={20} />, label: "Encrypted" },
  { icon: <ShieldCheck size={20} />, label: "Zero-trust" },
  { icon: <Users size={20} />, label: "Multi-user" },
  { icon: <Fingerprint size={20} />, label: "MFA" },
  { icon: <KeyRound size={20} />, label: "SSO Ready" },
  { icon: <Zap size={20} />, label: "Fast CDN" },
];

export function FeatureIconRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        marginTop: 64,
        position: "relative",
      }}
    >
      {/* Connecting line */}
      <div
        style={{
          position: "absolute",
          top: 28, // Centered perfectly within the 56px height icons
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "calc(100% - 120px)",
          height: 1,
          background: "linear-gradient(to right, transparent, rgba(186,215,247,0.12) 20%, rgba(186,215,247,0.12) 80%, transparent)",
          zIndex: 0,
        }}
      />
      {FEATURES.map((f, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            flex: 1,
            maxWidth: 120,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 9999,
              background: "rgba(186,214,247,0.06)",
              boxShadow: "rgba(186,215,247,0.12) 0px 0px 0px 1px inset",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d1e4fa",
            }}
          >
            {f.icon}
          </div>
          <span style={{ fontSize: 12, color: "var(--ak-moon)", textAlign: "center" }}>{f.label}</span>
        </div>
      ))}
    </div>
  );
}
