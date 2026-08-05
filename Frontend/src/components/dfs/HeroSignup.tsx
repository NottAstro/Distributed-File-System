import { useState } from "react";
import { SignInPreviewCard } from "./hero/SignInPreviewCard";
import { PasswordlessPreviewCard } from "./hero/PasswordlessPreviewCard";
import { SignUpCard } from "./hero/SignUpCard";
import { FeatureIconRow } from "./hero/FeatureIconRow";

/* ── Eyebrow with fading lines ── */
export function Eyebrow({ children }: { children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
      <span
        style={{
          flex: 1,
          height: 1,
          maxWidth: 80,
          background: "linear-gradient(to right, transparent, rgba(186,215,247,0.12))",
        }}
      />
      <span className="ak-eyebrow">{children}</span>
      <span
        style={{
          flex: 1,
          height: 1,
          maxWidth: 80,
          background: "linear-gradient(to left, transparent, rgba(186,215,247,0.12))",
        }}
      />
    </div>
  );
}

/* ── Main export ── */
export function HeroSignup() {
  const [activeIndex, setActiveIndex] = useState(1);

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#05060f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px 80px",
        overflow: "hidden",
      }}
    >
      {/* Blueprint grid */}
      <div
        className="ak-grid"
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
      />
      
      {/* Ambient glow behind wordmark */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 400,
          height: 200,
          background: "radial-gradient(ellipse, rgba(102,58,243,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Gradient wordmark */}
        <h1
          className="ak-animate-fade-up"
          style={{
            animationDelay: "80ms",
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(64px, 10vw, 120px)",
            lineHeight: 1.1,
            textAlign: "center",
            background: "linear-gradient(0deg, #d8ecf8 0%, #98c0ef 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginTop: 20,
            marginBottom: 16,
            filter: "drop-shadow(0 0 48px rgba(186,207,247,0.2))",
          }}
        >
          upLoader
        </h1>
        <p
          className="ak-animate-fade-up"
          style={{
            animationDelay: "160ms",
            fontSize: 17,
            lineHeight: 1.6,
            color: "var(--ak-moon)",
            textAlign: "center",
            maxWidth: 520,
            marginBottom: 60,
          }}
        >
          Split, encrypted and distributed across storage nodes worldwide.
          Upload once. Retrieve from anywhere, anytime.
        </p>

        {/* Three floating cards */}
        <div
          className="ak-animate-fade-up relative w-full h-[620px]"
          style={{
            animationDelay: "240ms",
            marginTop: 20,
          }}
        >
          {[
            SignInPreviewCard,
            SignUpCard,
            PasswordlessPreviewCard,
          ].map((CardComponent, index) => {
            let offset = index - activeIndex;
            if (offset === 2) offset = -1;
            if (offset === -2) offset = 1;

            let transform = "translate(-50%, 0) scale(1) rotate(0deg)";
            let zIndex = 10;
            let opacity = 1;

            if (offset === -1) {
              transform = "translate(calc(-50% - 180px), 40px) scale(0.88) rotate(-5deg)";
              zIndex = 0;
              opacity = 0.5;
            } else if (offset === 1) {
              transform = "translate(calc(-50% + 180px), 40px) scale(0.88) rotate(5deg)";
              zIndex = 0;
              opacity = 0.5;
            }

            return (
              <div
                key={index}
                className={offset !== 0 ? "hidden lg:block" : ""}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  transform,
                  zIndex,
                  opacity,
                  transition: "all 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                  cursor: offset === 0 ? "default" : "pointer",
                }}
                onClick={() => {
                  if (offset !== 0) setActiveIndex(index);
                }}
              >
                <div
                  style={{
                    pointerEvents: offset === 0 ? "auto" : "none",
                    transition: "opacity 300ms ease",
                  }}
                >
                  <CardComponent isActive={offset === 0} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature icon row */}
        <div
          className="ak-animate-fade-up"
          style={{ animationDelay: "400ms", width: "100%", maxWidth: 680 }}
        >
          <FeatureIconRow />
        </div>
      </div>
    </section>
  );
}
