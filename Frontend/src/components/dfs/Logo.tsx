import { cn } from "@/lib/utils";

export function Logo({ className, mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark && (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="6" height="6" fill="currentColor" opacity="0.9" />
          <rect x="13" y="1" width="6" height="6" fill="currentColor" opacity="0.45" />
          <rect x="7" y="7" width="6" height="6" fill="currentColor" opacity="0.7" />
          <rect x="1" y="13" width="6" height="6" fill="currentColor" opacity="0.45" />
          <rect x="13" y="13" width="6" height="6" fill="currentColor" opacity="0.9" />
        </svg>
      )}
      <span
        className="text-foreground"
        style={{
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 16,
          letterSpacing: "-0.01em",
        }}
      >
        upLoader
      </span>
    </span>
  );
}

export function FileTypeIcon({ type, className }: { type: string; className?: string }) {
  const palette: Record<string, string> = {
    pdf: "text-destructive",
    png: "text-teal",
    jpg: "text-teal",
    zip: "text-amber",
    mp4: "text-accent",
    csv: "text-teal",
    md: "text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-sm border border-border bg-surface font-mono text-[9px] uppercase",
        palette[type] ?? "text-muted-foreground",
        className,
      )}
    >
      {type.slice(0, 3)}
    </span>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
