import { cn } from "@/lib/utils";
import type { FileStatus } from "@/lib/core/types";

const MAP: Record<FileStatus, { label: string; dot: string; pulse?: boolean }> = {
  distributed: { label: "Distributed", dot: "bg-teal" },
  processing: { label: "Processing", dot: "bg-amber", pulse: true },
  failed: { label: "Failed", dot: "bg-destructive" },
};

export function StatusDot({ status, className }: { status: FileStatus; className?: string }) {
  const s = MAP[status];
  return (
    <span className={cn("inline-flex items-center gap-2 text-[14px]", className)}>
      <span className={cn("size-2 rounded-full", s.dot, s.pulse && "animate-pulse-dot")} />
      <span className="text-muted-foreground">{s.label}</span>
    </span>
  );
}
