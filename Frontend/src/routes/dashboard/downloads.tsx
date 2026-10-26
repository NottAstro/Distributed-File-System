/**
 * ──────────────────────────────────────────────────
 * downloads.tsx  —  DOWNLOADS PAGE  (URL: /dashboard/downloads)
 * ──────────────────────────────────────────────────
 * Files this browser has downloaded (kept in local
 * storage), with a "Download again" button.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/dfs/AppShell";
import { FileIcon } from "@/components/dfs/dashboard/FileIcon";
import { useDfs } from "@/lib/core/store";
import { formatBytes, formatRelative } from "@/lib/core/format";

const title = "Downloads — DFS";
const description = "Files you recently downloaded, reassembled from your storage nodes.";

export const Route = createFileRoute("/dashboard/downloads")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const { downloads, files, download, downloading } = useDfs();
  const byId = new Map(files.map((f) => [f.id, f]));

  return (
    <AppShell title="Downloads">
      <div className="mx-auto max-w-[880px]">
        <p className="text-[14px] text-[var(--ak-fog)]">
          Files you downloaded in this browser. Each download pulls the chunks from the nodes and
          rebuilds the file — using parity if a node is down.
        </p>

        <ul
          className="mt-6 overflow-hidden rounded-2xl border"
          style={{ borderColor: "rgba(186,215,247,0.07)", background: "rgba(199,211,234,0.02)" }}
        >
          {downloads.map((record) => {
            const file = byId.get(record.id);
            const dl = downloading[record.id];
            return (
              <li
                key={record.id}
                className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0"
              >
                <FileIcon type={record.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-white">{record.name}</p>
                  <p className="text-[12px] text-[var(--ak-fog)]">
                    {formatBytes(record.size)} · downloaded {formatRelative(record.at)}
                    {!file && " · no longer stored"}
                  </p>
                </div>
                {file && (
                  <button
                    disabled={dl !== undefined}
                    onClick={() =>
                      download(file)
                        .then(() => toast.success(`Downloaded ${file.name}`))
                        .catch((e: Error) => toast.error(e.message))
                    }
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-white/[0.09] px-3 text-[13px] text-[var(--ak-moon)] transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-60"
                  >
                    <Download className="size-3.5" />
                    {dl !== undefined ? `${dl}%` : "Download again"}
                  </button>
                )}
              </li>
            );
          })}
          {downloads.length === 0 && (
            <li className="px-6 py-16 text-center text-[15px] text-[var(--ak-fog)]">
              No downloads yet
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
