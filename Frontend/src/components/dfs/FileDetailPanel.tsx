import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { Pill } from "./Logo";
import { StatusDot } from "./StatusDot";
import { formatBytes, formatDateTime } from "@/lib/core/format";
import type { DfsFile, DownloadStage } from "@/lib/core/types";
import * as api from "@/lib/core/api";
import { toast } from "sonner";

const STAGE_LABEL: Record<Exclude<DownloadStage, "idle">, string> = {
  reassembling: "Reassembling chunks…",
  decrypting: "Decrypting…",
  ready: "Ready",
};

export function FileDetailPanel({
  file,
  onClose,
  onDelete,
}: {
  file: DfsFile;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [stage, setStage] = useState<DownloadStage>("idle");
  const [progress, setProgress] = useState(0);

  const meta: [string, React.ReactNode][] = [
    ["Size", formatBytes(file.size)],
    ["Uploaded", formatDateTime(file.uploadedAt)],
    ["Chunks", `${file.chunks} across ${file.nodes} nodes`],
    ["Encryption", file.encryption],
    ["Status", <StatusDot key="s" status={file.status} />],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        className="animate-slide-in relative flex h-full w-full max-w-[440px] flex-col border-l"
        style={{
          background: "rgba(5,6,15,0.97)",
          borderColor: "rgba(186,215,247,0.08)",
        }}
      >
        {stage !== "idle" && (
          <div className="h-1 w-full bg-surface">
            <div
              className="h-full bg-teal transition-[width] duration-150 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-medium">{file.name}</h2>
            <div className="mt-2">
              <Pill>{file.type}</Pill>
            </div>
          </div>
          <Button variant="icon" onClick={onClose} aria-label="Close file details">
            <X className="size-4" />
          </Button>
        </header>

        <dl className="flex-1 overflow-y-auto px-6 py-5">
          {meta.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-border py-3"
            >
              <dt className="font-mono text-[12px] uppercase tracking-[0.08em] text-faint">
                {label}
              </dt>
              <dd className="font-mono text-[13px] text-foreground">{value}</dd>
            </div>
          ))}

          {stage !== "idle" && (
            <p className="mt-5 font-mono text-[12px] text-teal">{STAGE_LABEL[stage]}</p>
          )}
        </dl>

        <footer className="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
          <Button
            disabled={stage !== "idle" && stage !== "ready"}
            onClick={async () => {
              setStage("reassembling");
              await api.downloadFile(file.id, (s, p) => {
                setStage(s);
                setProgress(p);
              });
              toast.success(`${file.name} ready`);
            }}
          >
            Download
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const url = await api.createShareLink(file.id);
              toast.success("Share link copied", { description: url });
              void navigator.clipboard?.writeText(url).catch(() => undefined);
            }}
          >
            Share Link
          </Button>
          <Button
            variant="ghost"
            className="ml-auto hover:text-destructive"
            onClick={() => {
              onDelete(file.id);
              onClose();
            }}
          >
            Delete
          </Button>
        </footer>
      </section>
    </div>
  );
}
