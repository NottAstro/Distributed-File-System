/**
 * HeroGoogleButton — Google sign-in for the landing page's hero cards.
 * Thin wrapper over the shared GoogleSignInButton (one implementation,
 * one source of truth for the client ID).
 */
import { GoogleSignInButton } from "../GoogleSignInButton";

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
  return (
    <GoogleSignInButton
      onCredential={onCredential}
      disabled={disabled}
      label={label}
      isActive={isActive}
    />
  );
}
