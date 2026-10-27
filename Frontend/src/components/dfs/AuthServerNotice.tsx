import { CircleAlert } from "lucide-react";
import { useDfs } from "@/lib/core/store";

/**
 * Banner for auth screens when the API can't be reached, so people see
 * "the server is down" instead of "invalid password" on every attempt.
 */
export function AuthServerNotice() {
  const { authConfigError } = useDfs();
  if (!authConfigError) return null;
  return (
    <div
      role="alert"
      className="mt-6 flex items-start gap-2.5 rounded-lg border border-[rgba(251,191,36,0.25)] bg-[rgba(251,191,36,0.06)] px-3 py-2.5 text-left text-[13px] text-amber"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <span>Sign-in is temporarily unavailable — {authConfigError}</span>
    </div>
  );
}
