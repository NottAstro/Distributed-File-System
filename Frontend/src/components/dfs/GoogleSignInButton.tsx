/**
 * ──────────────────────────────────────────────────
 * GoogleSignInButton.tsx — Google Sign-In Button
 * ──────────────────────────────────────────────────
 * Loads Google Identity Services (GSI) script and
 * renders Google's real button (hidden) behind a
 * custom-styled overlay. Clicks pass through to the
 * real Google button, keeping the reliable auth flow
 * while matching the app's dark glass aesthetic.
 * ──────────────────────────────────────────────────
 */
import { useEffect, useRef, useState } from "react";

/** The Google Client ID — reads from Vite env var */
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  disabled?: boolean;
  text?: "signin_with" | "signup_with" | "continue_with";
}

// Extend window type for Google's GSI library
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

/* Official multi-color Google "G" logo */
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

const LABEL_MAP: Record<string, string> = {
  signin_with: "Sign in with Google",
  signup_with: "Sign up with Google",
  continue_with: "Continue with Google",
};

export { GoogleLogo };

export function GoogleSignInButton({
  onCredential,
  disabled = false,
  text = "signin_with",
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const textRef = useRef(text);
  textRef.current = text;

  // 1. Load the Google script exactly once
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

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
  }, []);

  // 2. Render the button when script is loaded OR when resetKey changes
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    // We must initialize before rendering
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
      width: 400,
      text: textRef.current,
      shape: "rectangular",
      logo_alignment: "left",
    });

    setReady(true);
  }, [scriptLoaded, resetKey]);

  // 3. If user closes the popup, the window regains focus. 
  // We increment resetKey to completely destroy and recreate the DOM node, 
  // wiping Google's "disabled" cooldown state from the element.
  useEffect(() => {
    const handleFocus = () => {
      setResetKey((prev) => prev + 1);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

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
            {LABEL_MAP[textRef.current] || "Sign in with Google"}
          </>
        ) : (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ak-moon)] border-t-transparent" />
        )}
      </div>
    </div>
  );
}
