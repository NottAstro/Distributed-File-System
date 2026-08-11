/**
 * ──────────────────────────────────────────────────
 * OtpInput.tsx — 6-digit OTP Input Component
 * ──────────────────────────────────────────────────
 * Auto-focus, auto-advance, paste support, backspace
 * navigation, and countdown timer for resend.
 * ──────────────────────────────────────────────────
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  resendCooldown?: number; // seconds
  onResend?: () => void;
  compact?: boolean; // smaller boxes for narrow containers
}

export function OtpInput({
  length = 6,
  onComplete,
  disabled = false,
  resendCooldown = 60,
  onResend,
  compact = false,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const [cooldown, setCooldown] = useState(resendCooldown);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const focusInput = useCallback(
    (index: number) => {
      if (index >= 0 && index < length) {
        inputRefs.current[index]?.focus();
      }
    },
    [length],
  );

  const handleChange = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      const digit = value.replace(/\D/g, "").slice(-1);
      const newDigits = [...digits];
      newDigits[index] = digit;
      setDigits(newDigits);

      // Auto-advance to next input
      if (digit && index < length - 1) {
        focusInput(index + 1);
      }

      // Check if complete
      const code = newDigits.join("");
      if (code.length === length && newDigits.every((d) => d !== "")) {
        onComplete(code);
      }
    },
    [digits, length, focusInput, onComplete],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          // Clear current digit
          const newDigits = [...digits];
          newDigits[index] = "";
          setDigits(newDigits);
        } else if (index > 0) {
          // Move to previous input and clear it
          focusInput(index - 1);
          const newDigits = [...digits];
          newDigits[index - 1] = "";
          setDigits(newDigits);
        }
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        focusInput(index - 1);
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        focusInput(index + 1);
        e.preventDefault();
      }
    },
    [digits, focusInput],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (!pasted) return;

      const newDigits = [...digits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setDigits(newDigits);
      // Focus the next empty or last input
      const nextEmpty = newDigits.findIndex((d) => d === "");
      focusInput(nextEmpty === -1 ? length - 1 : nextEmpty);

      // Check if complete
      const code = newDigits.join("");
      if (code.length === length && newDigits.every((d) => d !== "")) {
        onComplete(code);
      }
    },
    [digits, length, focusInput, onComplete],
  );

  const handleResend = () => {
    if (cooldown > 0 || !onResend) return;
    setDigits(Array(length).fill(""));
    setCooldown(resendCooldown);
    focusInput(0);
    onResend();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* OTP digit boxes */}
      <div className="flex gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`${
              compact
                ? "h-10 w-[36px] rounded-md text-base"
                : "h-12 w-10 sm:h-14 sm:w-12 sm:text-xl rounded-lg text-lg"
            } border border-[var(--ak-glass-border)] bg-[var(--ak-glass)] text-center font-semibold text-foreground outline-none transition-all duration-200 focus:border-[#818cf8] focus:ring-1 focus:ring-[#818cf8]/40 disabled:opacity-50`}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {/* Resend timer */}
      {onResend && (
        <div className="text-center text-[13px]">
          {cooldown > 0 ? (
            <span className="text-faint">
              Resend code in{" "}
              <span className="font-mono text-foreground">
                {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={disabled}
              className="text-[#818cf8] transition-colors hover:text-[#a5b4fc] disabled:opacity-50"
            >
              Resend code
            </button>
          )}
        </div>
      )}
    </div>
  );
}
