import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Download, Lock, ShieldCheck, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, formatDateTime } from "@/lib/core/format";
import { useDfs } from "@/lib/core/store";
import type { DfsFile, FileDetail } from "@/lib/core/types";
import * as api from "@/lib/core/api";
import { toast } from "sonner";
import { FileIcon } from "./dashboard/FileIcon";
import { StatusDot } from "./StatusDot";

/** Slide-in with file metadata and a live map of where its chunks live. */
export function FileDetailPanel({
  file,
  onClose,
  onDelete,
}: {
  file: DfsFile;
  onClose: () => void;
  onDelete: (file: DfsFile) => void;
}) {
  const { download, downloading } = useDfs();
  const [detail, setDetail] = useState<FileDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = downloading[file.id];

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    api
      .getFileDetail(file.id)
      .then((d) => !cancelled && setDetail(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [file.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const unhealthy = detail?.chunks.filter((c) => !c.healthy).length ?? 0;

  const meta: [string, React.ReactNode][] = [
    ["Size", formatBytes(file.size)],
    ["Uploaded", formatDateTime(file.uploadedAt)],
    [
      "Location",
      detail ? (detail.path.length ? detail.path.map((p) => p.name).join(" / ") : "My Files") : "…",
    ],
    ["Type", file.mimeType],
    [
      "Encryption",
      file.encrypted ? (
        <span key="e" className="inline-flex items-center gap-1.5 text-teal">
          <Lock className="size-3.5" /> AES-256-GCM at rest
        </span>
      ) : (
        <span key="e" className="text-amber" title="Stored before encryption was enabled">
          Not yet encrypted
        </span>
      ),
    ],
    ["Status", <StatusDot key="s" status={file.status} />],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={file.name}
    >
      <div
        className="absolute inset-0 bg-[#05060f]/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        className="animate-slide-in relative flex h-full w-full max-w-[440px] flex-col border-l"
        style={{ background: "rgba(8,10,22,0.98)", borderColor: "rgba(186,215,247,0.08)" }}
      >
        {progress !== undefined && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-white/5">
            <div
              className="h-full bg-[#8b6cf7] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <header className="flex items-start gap-4 px-6 pb-5 pt-6">
          <FileIcon type={file.type} size="lg" />
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="break-words text-[17px] font-medium leading-snug text-white">
              {file.name}
            </h2>
            <p className="mt-1 font-mono text-[12px] uppercase text-[var(--ak-fog)]">
              {file.type} · {formatBytes(file.size)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close file details"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--ak-fog)] hover:bg-white/5 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <dl className="rounded-xl border border-white/[0.06]">
            {meta.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-white/[0.05] px-4 py-3 last:border-0"
              >
                <dt className="text-[13px] text-[var(--ak-fog)]">{label}</dt>
                <dd className="min-w-0 truncate text-right text-[13px] text-white">{value}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-7 flex items-center gap-2 text-[13px] font-medium text-white">
            <ShieldCheck className="size-4 text-teal" /> Chunk placement
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--ak-fog)]">
            Split into two halves plus an XOR parity chunk on separate nodes, each encrypted at
            rest. Any one node can fail and the file is still recoverable.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {(detail?.chunks ?? [0, 1, 2].map(() => null)).map((c, i) => (
              <div
                key={c?.index ?? i}
                className={cn(
                  "rounded-xl border p-3",
                  !c && "animate-pulse",
                  c && !c.healthy
                    ? "border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.06)]"
                    : "border-white/[0.07] bg-white/[0.02]",
                )}
              >
                {c ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--ak-fog)]">
                        {c.role}
                      </span>
                      {c.healthy ? (
                        <CircleCheck className="size-3.5 text-teal" aria-label="Healthy" />
                      ) : (
                        <CircleAlert className="size-3.5 text-[#fca5a5]" aria-label="Missing" />
                      )}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[14px] font-medium text-white">
                      {c.node}
                      {c.encryption !== "none" && (
                        <Lock className="size-3 text-[var(--ak-fog)]" aria-label="Encrypted" />
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-[var(--ak-fog)]">
                      {formatBytes(c.size)}
                    </p>
                    <p
                      className="mt-1.5 truncate font-mono text-[10px] text-[var(--ak-fog)]/70"
                      title={c.checksum}
                    >
                      {c.checksum.slice(0, 10)}…
                    </p>
                  </>
                ) : (
                  <div className="h-[74px]" />
                )}
              </div>
            ))}
          </div>

          {unhealthy === 1 && (
            <p className="mt-3 rounded-lg bg-[rgba(251,191,36,0.08)] px-3 py-2 text-[12px] text-amber">
              One chunk is missing — downloads still work by rebuilding it from parity.
            </p>
          )}
          {unhealthy > 1 && (
            <p className="mt-3 rounded-lg bg-[rgba(248,113,113,0.08)] px-3 py-2 text-[12px] text-[#fca5a5]">
              {unhealthy} chunks are missing. This file can no longer be rebuilt.
            </p>
          )}
          {error && <p className="mt-3 text-[13px] text-[#fca5a5]">{error}</p>}
        </div>

        <footer className="flex items-center gap-2 border-t border-white/[0.06] px-6 py-4">
          <button
            disabled={progress !== undefined || file.status !== "distributed"}
            onClick={() =>
              download(file)
                .then(() => toast.success(`Downloaded ${file.name}`))
                .catch((e: Error) => toast.error(e.message))
            }
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#663af3] text-[14px] font-medium text-white transition-colors hover:bg-[#7450f5] disabled:opacity-50"
          >
            <Download className="size-4" />
            {progress !== undefined ? `Downloading ${progress}%` : "Download"}
          </button>
          <button
            onClick={() => onDelete(file)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[14px] text-[#fca5a5] transition-colors hover:bg-[rgba(248,113,113,0.08)]"
          >
            <Trash2 className="size-4" /> Delete
          </button>
        </footer>
      </section>
    </div>
  );
}
