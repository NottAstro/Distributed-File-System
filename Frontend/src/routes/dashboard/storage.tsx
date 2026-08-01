/**
 * ──────────────────────────────────────────────────
 * storage.tsx  —  STORAGE PAGE  (URL: /dashboard/storage)
 * ──────────────────────────────────────────────────
 * Shows storage usage meter (used / quota) and a
 * breakdown bar chart by file type (pdf, png, zip…).
 * ──────────────────────────────────────────────────
 */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/dfs/AppShell";
import { StorageMeter } from "@/components/dfs/StorageMeter";
import { useDfs } from "@/lib/dfs/store";
import { formatBytes } from "@/lib/dfs/format";

const title = "Storage — DFS";
const description = "Track distributed storage usage and how it breaks down by file type.";

export const Route = createFileRoute("/dashboard/storage")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: StoragePage,
});

const COLORS = ["bg-teal", "bg-accent", "bg-amber", "bg-destructive", "bg-muted-foreground"];

function StoragePage() {
  const { storage, files } = useDfs();

  const byType = Object.entries(
    files.reduce<Record<string, number>>((acc, f) => {
      acc[f.type] = (acc[f.type] ?? 0) + f.size;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const total = byType.reduce((sum, [, v]) => sum + v, 0) || 1;

  return (
    <AppShell title="Storage">
      <div className="max-w-[720px] space-y-12">
        <section>
          <h2 className="text-overline text-faint">Usage</h2>
          {storage && (
            <div className="mt-4">
              <StorageMeter usedBytes={storage.usedBytes} quotaBytes={storage.quotaBytes} />
            </div>
          )}
        </section>

        <section>
          <h2 className="text-overline text-faint">Breakdown by file type</h2>
          <div className="mt-4 flex h-2 w-full overflow-hidden bg-surface">
            {byType.map(([type, size], i) => (
              <span
                key={type}
                className={COLORS[i % COLORS.length]}
                style={{ width: `${(size / total) * 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-5 space-y-2.5">
            {byType.map(([type, size], i) => (
              <li key={type} className="flex items-center gap-3 font-mono text-[13px]">
                <span className={`size-2 ${COLORS[i % COLORS.length]}`} />
                <span className="uppercase text-muted-foreground">{type}</span>
                <span className="ml-auto text-faint">{formatBytes(size)}</span>
              </li>
            ))}
          </ul>
        </section>

        <button className="text-[14px] text-faint underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline">
          Request More Storage
        </button>
      </div>
    </AppShell>
  );
}
