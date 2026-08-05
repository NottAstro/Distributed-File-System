/**
 * ──────────────────────────────────────────────────
 * downloads.tsx  —  DOWNLOADS PAGE  (URL: /dashboard/downloads)
 * ──────────────────────────────────────────────────
 * Lists recently retrieved files. Each entry shows
 * file name, size, retrieval date, and a "Download
 * again" button.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/dfs/AppShell";
import { Button } from "@/components/dfs/Button";
import { FileTypeIcon } from "@/components/dfs/Logo";
import { useDfs } from "@/lib/core/store";
import { formatBytes, formatDateTime } from "@/lib/core/format";
import * as api from "@/lib/core/api";
import { toast } from "sonner";

const title = "Downloads — DFS";
const description = "Recently retrieved files, reassembled and decrypted from your storage nodes.";

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
  const { files } = useDfs();
  const recent = files.filter((f) => f.status === "distributed").slice(0, 4);

  return (
    <AppShell title="Downloads">
      <p className="max-w-[540px] text-[15px] text-muted-foreground">
        Files you retrieved recently. Each retrieval pulls chunks in parallel from the nearest
        healthy nodes, then decrypts locally.
      </p>

      <ul className="mt-8 border-t border-border">
        {recent.map((file) => (
          <li
            key={file.id}
            className="flex h-[64px] items-center gap-3 border-b border-border transition-colors duration-200 hover:bg-hover"
          >
            <FileTypeIcon type={file.type} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px]">{file.name}</p>
              <p className="font-mono text-[12px] text-faint">
                {formatBytes(file.size)} · retrieved {formatDateTime(file.uploadedAt)}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void api
                  .downloadFile(file.id, () => undefined)
                  .then(() => toast.success(`${file.name} ready`))
              }
            >
              Download again
            </Button>
          </li>
        ))}
        {recent.length === 0 && (
          <li className="py-16 text-center text-[15px] text-muted-foreground">No downloads yet</li>
        )}
      </ul>
    </AppShell>
  );
}
