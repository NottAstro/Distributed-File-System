/**
 * HeroGoogleButton — Custom-styled Google sign-in for hero cards.
 *
 * Uses Google's real renderButton() hidden underneath with a custom-styled
 * overlay on top. Clicks pass through to Google's real button, keeping
 * reliable auth while matching the glass card aesthetic.
 */
import { useEffect, useRef, useState } from "react";
import { GoogleLogo } from "../GoogleSignInButton";

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";

interface HeroGoogleButtonProps {
  onCredential: (credential: string) => void;
  disabled?: boolean;
  label?: string;
  isActive?: boolean;
}

export function HeroGoogleButton({
  onCredential,
  disabled = false,
  label = "Sign in with Google",
  isActive = true,
}: HeroGoogleButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  // 1. Load script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !isActive) return;

    let isMounted = true;
    const scriptId = "google-gsi-script";

    function pollGoogle() {
      if (!isMounted) return;
      if (window.google?.accounts?.id) {
        setScriptLoaded(true);
      } else {
        setTimeout(pollGoogle, 100);
      }
    }

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    pollGoogle();

    return () => {
      isMounted = false;
    };
  }, [isActive]);

  // 2. Render button
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !isActive) return;

    window.google!.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => {
        callbackRef.current(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: false,
    });

    window.google!.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      width: 300,
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
    });

    setReady(true);
  }, [scriptLoaded, resetKey, isActive]);

  // 3. Reset on focus
  useEffect(() => {
    const handleFocus = () => setResetKey((prev) => prev + 1);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      key={resetKey}
      className="relative w-full"
      style={{ height: 44, overflow: "hidden", borderRadius: 8 }}
    >
      {/* Hidden real Google button — sits on top for click handling */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          opacity: 0,
          cursor: "pointer",
        }}
        className={`[&>div]:!w-full [&>div]:!h-full [&_iframe]:!w-full [&_iframe]:!h-full ${disabled ? "pointer-events-none" : ""}`}
      />

      {/* Visible styled button — purely visual */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          height: "100%",
          borderRadius: 8,
          background: "rgba(199,211,234,0.06)",
          boxShadow: "rgba(186,215,247,0.12) 0px 0px 0px 1px inset",
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "var(--font-sans)",
          opacity: disabled || !ready ? 0.5 : 1,
          position: "relative",
          zIndex: 1,
        }}
      >
        {ready ? (
          <>
            <GoogleLogo size={18} />
            {label}
          </>
        ) : (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ak-moon)] border-t-transparent" />
        )}
      </div>
    </div>
  );
}

