import { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function AkInput({
  label,
  id: idProp,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} style={{ fontSize: 12, color: "var(--ak-moon)", display: "block" }}>
        {label}
      </label>
      <input
        id={id}
        className={cn("ak-input h-10 w-full px-3 text-[14px] placeholder:opacity-50", className)}
        style={{ fontFamily: "var(--font-sans)" }}
        {...props}
      />
    </div>
  );
}

export function AkPasswordInput({
  label,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label style={{ fontSize: 12, color: "var(--ak-moon)", display: "block" }}>{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className="ak-input h-10 w-full px-3 pr-10 text-[14px] placeholder:opacity-50"
          style={{ fontFamily: "var(--font-sans)" }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ak-moon)",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

export function OrDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
      <span
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(to right, transparent, rgba(186,215,247,0.12), transparent)",
        }}
      />
      <span
        style={{
          fontSize: 11,
          color: "var(--ak-fog)",
          letterSpacing: "0.08em",
          fontFamily: "var(--font-eyebrow)",
        }}
      >
        OR
      </span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(to right, transparent, rgba(186,215,247,0.12), transparent)",
        }}
      />
    </div>
  );
}

export function SocialButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        padding: "10px 16px",
        borderRadius: 999,
        background: "rgba(199,211,234,0.06)",
        boxShadow: "rgba(186,215,247,0.12) 0px 0px 0px 1px inset",
        color: "#ffffff",
        fontSize: 13,
        fontWeight: 500,
        border: "none",
        cursor: "pointer",
        transition: "background 200ms ease",
        fontFamily: "var(--font-sans)",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = "rgba(199,211,234,0.10)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = "rgba(199,211,234,0.06)")
      }
    >
      {icon}
      {label}
    </button>
  );
}
