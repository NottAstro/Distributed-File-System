import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/dfs/format";

export function StorageMeter({
  usedBytes,
  quotaBytes,
  className,
  compact = false,
}: {
  usedBytes: number;
  quotaBytes: number;
  className?: string;
  compact?: boolean;
}) {
  const ratio = quotaBytes ? Math.min(usedBytes / quotaBytes, 1) : 0;
  const fill = ratio >= 0.9 ? "bg-destructive" : ratio >= 0.75 ? "bg-amber" : "bg-teal";

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("w-full overflow-hidden bg-surface", compact ? "h-1" : "h-1.5")}>
        <div
          className={cn("h-full transition-all duration-200 ease-out", fill)}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="font-mono text-[12px] text-faint">
        {formatBytes(usedBytes)} of {formatBytes(quotaBytes)} used
      </p>
    </div>
  );
}
