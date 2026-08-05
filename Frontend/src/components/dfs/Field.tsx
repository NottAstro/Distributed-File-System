import { cn } from "@/lib/utils";
import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FieldProps extends ComponentProps<"input"> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, className, id, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-[13px] text-muted-foreground">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "ak-input h-11 w-full px-3 text-[15px] disabled:opacity-60",
          className,
        )}
        {...props}
      />
      {hint && <p className="font-mono text-[12px] text-faint">{hint}</p>}
    </div>
  );
}

export function PasswordField({ label, ...props }: FieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Field label={label} type={show ? "text" : "password"} className="pr-11" {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-[30px] flex size-8 items-center justify-center rounded-md text-faint transition-colors duration-200 hover:bg-hover hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function PasswordStrength({ value }: { value: string }) {
  const score = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;

  const label = ["Too short", "Weak", "Fair", "Good", "Strong"][score]!;
  const color =
    score <= 1 ? "bg-destructive" : score === 2 ? "bg-amber" : score === 3 ? "bg-amber" : "bg-teal";

  return (
    <div className="space-y-1.5">
      <div className="h-1 w-full overflow-hidden bg-surface">
        <div
          className={cn("h-full transition-all duration-200 ease-out", color)}
          style={{ width: `${(score / 4) * 100}%` }}
        />
      </div>
      <p className="font-mono text-[12px] text-faint">{label}</p>
    </div>
  );
}
