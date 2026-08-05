import { useRef, useState } from "react";
import { X, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDfs } from "@/lib/core/store";
import { Button } from "./Button";
import { FileTypeIcon } from "./Logo";
import { formatBytes } from "@/lib/core/format";
import type { UploadStage } from "@/lib/core/types";

const STAGE_LABEL: Record<UploadStage, string> = {
  queued: "Ready",
  encrypting: "Encrypting…",
  chunking: "Chunking…",
  distributing: "Distributing…",
  complete: "Complete ✓",
  failed: "Cancelled",
};

export function UploadPanel() {
  const { uploadOpen, setUploadOpen, uploads, enqueue, removeFromQueue, clearQueue, startUploads } =
    useDfs();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!uploadOpen) return null;

  const accept = (list: FileList | null) => {
    if (!list) return;
    enqueue(Array.from(list).map((f) => ({ name: f.name, size: f.size })));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
        onClick={() => setUploadOpen(false)}
        aria-hidden="true"
      />

      <section
        className={cn(
          "animate-slide-in relative flex h-full w-full max-w-[480px] flex-col border-l transition-colors duration-200",
          dragging ? "border-accent bg-accent/[0.04]" : "border-border",
        )}
        style={{
          background: dragging ? undefined : "rgba(5,6,15,0.97)",
          borderColor: dragging ? undefined : "rgba(186,215,247,0.08)",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
      >
        <header className="flex h-[68px] items-center justify-between border-b border-border px-6">
          <h2 className="text-[18px] font-medium">Upload to DFS</h2>
          <Button variant="icon" onClick={() => setUploadOpen(false)} aria-label="Close upload panel">
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <ArrowDown
              className={cn(
                "size-5 transition-colors duration-200",
                dragging ? "text-accent" : "text-faint",
              )}
            />
            <p className={cn("text-[15px]", dragging ? "text-accent" : "text-muted-foreground")}>
              {dragging ? "Release to upload" : "Drop files anywhere on this panel"}
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              className="text-[14px] text-faint underline-offset-4 transition-colors duration-200 hover:text-foreground hover:underline"
            >
              or browse from your device
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => accept(e.target.files)}
            />
          </div>

          {uploads.length > 0 && (
            <ul className="border-t border-border">
              {uploads.map((item) => (
                <li key={item.id} className="border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileTypeIcon type={item.type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px]">{item.name}</p>
                      <p className="font-mono text-[12px] text-faint">{formatBytes(item.size)}</p>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-[12px]",
                        item.stage === "complete" ? "text-teal" : "text-faint",
                      )}
                    >
                      {STAGE_LABEL[item.stage]}
                    </span>
                    <Button
                      variant="icon"
                      aria-label={item.stage === "queued" ? "Remove" : "Cancel"}
                      onClick={() => removeFromQueue(item.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-3 h-1 w-full bg-surface">
                    <div
                      className="h-full bg-teal transition-[width] duration-150 ease-linear"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-border px-6 py-4">
          <Button
            disabled={busy || !uploads.some((u) => u.stage === "queued")}
            onClick={async () => {
              setBusy(true);
              await startUploads();
              setBusy(false);
            }}
          >
            {busy ? "Uploading…" : "Upload All"}
          </Button>
          <Button variant="ghost" size="md" onClick={clearQueue} disabled={uploads.length === 0}>
            Clear Queue
          </Button>
        </footer>
      </section>
    </div>
  );
}
