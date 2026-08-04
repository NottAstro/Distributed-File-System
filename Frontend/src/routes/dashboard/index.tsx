/**
 * ──────────────────────────────────────────────────
 * index.tsx  —  MY FILES PAGE  (URL: /dashboard)
 * ──────────────────────────────────────────────────
 * Main dashboard view. Shows a searchable table of
 * all uploaded files with download/share/delete actions.
 * Clicking a file opens the FileDetailPanel slide-in.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/dfs/AppShell";
import { Button } from "@/components/dfs/Button";
import { FileTable } from "@/components/dfs/FileTable";
import { FileDetailPanel } from "@/components/dfs/FileDetailPanel";
import { useDfs } from "@/lib/dfs/store";
import type { DfsFile } from "@/lib/dfs/types";
import * as api from "@/lib/dfs/api";
import { toast } from "sonner";

const title = "My Files — DFS";
const description = "Browse, download and manage every file distributed across your DFS nodes.";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: FilesPage,
});

function FilesPage() {
  const { files, filesLoading, removeFile, setUploadOpen } = useDfs();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DfsFile | null>(null);

  const visible = useMemo(
    () => files.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase())),
    [files, query],
  );

  const handleDelete = async (id: string) => {
    await removeFile(id);
    toast.success("File removed from all nodes");
  };

  return (
    <AppShell
      title="My Files"
      actions={
        <>
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              className="h-[41px] w-[220px] rounded-md border border-border bg-surface pl-9 pr-3 text-[14px] placeholder:text-faint focus:border-border-strong focus:outline-none"
            />
          </div>
          <Button onClick={() => setUploadOpen(true)}>Upload File</Button>
        </>
      }
    >
      {filesLoading && files.length === 0 ? (
        <p className="font-mono text-[12px] text-faint">Loading files…</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <p className="text-[18px]">No files yet</p>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Upload your first file to get started
          </p>
          <Button className="mt-6" onClick={() => setUploadOpen(true)}>
            Upload
          </Button>
        </div>
      ) : (
        <FileTable
          files={visible}
          onSelect={setSelected}
          onDelete={(id) => void handleDelete(id)}
          onDownload={(file) =>
            void api
              .downloadFile(file.id, () => undefined)
              .then(() => toast.success(`${file.name} ready`))
          }
          onShare={(file) =>
            void api.createShareLink(file.id).then((url) => {
              toast.success("Share link copied", { description: url });
              void navigator.clipboard?.writeText(url).catch(() => undefined);
            })
          }
        />
      )}

      {selected && (
        <FileDetailPanel
          file={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </AppShell>
  );
}
