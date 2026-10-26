/**
 * ──────────────────────────────────────────────────
 * storage.tsx  —  STORAGE PAGE  (URL: /dashboard/storage)
 * ──────────────────────────────────────────────────
 * Usage vs quota, per-node health and capacity, and
 * a breakdown by file type.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute } from "@tanstack/react-router";
import { Server } from "lucide-react";
import { AppShell } from "@/components/dfs/AppShell";
import { StorageMeter } from "@/components/dfs/StorageMeter";
import { kindOf } from "@/components/dfs/dashboard/FileIcon";
import { useDfs } from "@/lib/core/store";
import { formatBytes, formatRelative } from "@/lib/core/format";
import { cn } from "@/lib/utils";

const title = "Storage — DFS";
const description =
  "Track distributed storage usage, node health, and how it breaks down by file type.";

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

const KIND_LABEL: Record<string, string> = {
  image: "Images",
  video: "Video",
  audio: "Audio",
  archive: "Archives",
  code: "Code",
  sheet: "Spreadsheets",
  doc: "Documents",
  pdf: "PDFs",
  other: "Other",
};
const COLORS = [
  "#8b6cf7",
  "#2dd4bf",
  "#fbbf24",
  "#f87171",
  "#60a5fa",
  "#e879f9",
  "#4ade80",
  "#c7d3ea",
  "#9da7ba",
];

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border p-5", className)}
      style={{ borderColor: "rgba(186,215,247,0.07)", background: "rgba(199,211,234,0.025)" }}
    >
      <h2 className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--ak-fog)]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StoragePage() {
  const { storage, files, nodes } = useDfs();

  const byKind = Object.entries(
    files.reduce<Record<string, number>>((acc, f) => {
      const k = kindOf(f.type);
      acc[k] = (acc[k] ?? 0) + f.size;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const total = byKind.reduce((sum, [, v]) => sum + v, 0) || 1;

  return (
    <AppShell title="Storage">
      <div className="mx-auto grid max-w-[1080px] gap-4 lg:grid-cols-2">
        <Card title="Your usage">
          {storage ? (
            <>
              <p className="font-[family-name:var(--font-display)] text-[32px] tracking-[-0.02em] text-white">
                {formatBytes(storage.usedBytes)}
                <span className="ml-2 text-[15px] text-[var(--ak-fog)]">
                  of {formatBytes(storage.quotaBytes)}
                </span>
              </p>
              <StorageMeter
                usedBytes={storage.usedBytes}
                quotaBytes={storage.quotaBytes}
                className="mt-3"
              />
              <p className="mt-3 text-[13px] text-[var(--ak-fog)]">
                Parity adds about 50% on top of this on the nodes (each file is stored as two halves
                plus one parity half).
              </p>
            </>
          ) : (
            <div className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
          )}
        </Card>

        <Card title="By file type">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            {byKind.map(([kind, size], i) => (
              <span
                key={kind}
                style={{ width: `${(size / total) * 100}%`, background: COLORS[i % COLORS.length] }}
                title={`${KIND_LABEL[kind]}: ${formatBytes(size)}`}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {byKind.map(([kind, size], i) => (
              <li key={kind} className="flex items-center gap-3 text-[13px]">
                <span
                  className="size-2 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-[var(--ak-moon)]">{KIND_LABEL[kind]}</span>
                <span className="ml-auto font-mono text-[12px] text-[var(--ak-fog)]">
                  {formatBytes(size)}
                </span>
              </li>
            ))}
            {byKind.length === 0 && (
              <li className="text-[13px] text-[var(--ak-fog)]">No files yet</li>
            )}
          </ul>
        </Card>

        <Card title="Storage nodes" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            {nodes.map((n) => {
              const ratio = n.totalBytes ? Math.min(n.usedBytes / n.totalBytes, 1) : 0;
              const online = n.status === "online";
              return (
                <div
                  key={n.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4"
                >
                  <div className="flex items-center gap-2">
                    <Server className="size-4 text-[var(--ak-fog)]" />
                    <span className="text-[14px] font-medium text-white">{n.name}</span>
                    <span
                      className={cn(
                        "ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]",
                        online
                          ? "bg-[rgba(45,212,191,0.1)] text-teal"
                          : "bg-[rgba(251,191,36,0.1)] text-amber",
                      )}
                    >
                      <span
                        className={cn("size-1.5 rounded-full", online ? "bg-teal" : "bg-amber")}
                      />
                      {n.status}
                    </span>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-[#8b6cf7]"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-[var(--ak-fog)]">
                    {formatBytes(n.usedBytes)} of {formatBytes(n.totalBytes)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--ak-fog)]/70">
                    updated {formatRelative(n.lastHeartbeat)}
                  </p>
                </div>
              );
            })}
            {nodes.length === 0 && (
              <p className="text-[13px] text-[var(--ak-fog)]">No node information available.</p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
