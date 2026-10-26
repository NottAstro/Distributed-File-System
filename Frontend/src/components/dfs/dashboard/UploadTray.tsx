import { useState } from "react";
import { Check, ChevronDown, CircleAlert, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDfs } from "@/lib/core/store";
import { formatBytes } from "@/lib/core/format";
import type { UploadItem } from "@/lib/core/types";
import { FileIcon } from "./FileIcon";

const ACTIVE = new Set(["queued", "uploading", "distributing"]);

function statusText(u: UploadItem): string {
  switch (u.stage) {
    case "queued":
      return "Waiting…";
    case "uploading":
      return `${u.progress}% · ${formatBytes((u.size * u.progress) / 100)} of ${formatBytes(u.size)}`;
    case "distributing":
      return "Splitting across nodes…";
    case "complete":
      return u.relativePath
        ? u.relativePath.split("/").slice(0, -1).join(" / ")
        : formatBytes(u.size);
    case "cancelled":
      return "Cancelled";
    case "failed":
      return u.error || "Upload failed";
  }
}

/** Floating upload progress tray (bottom-right), like a desktop sync client. */
export function UploadTray() {
  const { uploads, cancelUpload, retryUpload, clearFinishedUploads } = useDfs();
  const [collapsed, setCollapsed] = useState(false);

  if (uploads.length === 0) return null;

  const active = uploads.filter((u) => ACTIVE.has(u.stage));
  const failed = uploads.filter((u) => u.stage === "failed");
  const done = uploads.filter((u) => u.stage === "complete");
  const totalBytes = active.reduce((s, u) => s + u.size, 0);
  const sentBytes = active.reduce(
    (s, u) => s + (u.stage === "distributing" ? u.size : (u.size * u.progress) / 100),
    0,
  );
  const overall = totalBytes ? Math.round((sentBytes / totalBytes) * 100) : 100;

  const heading = active.length
    ? `Uploading ${active.length} item${active.length === 1 ? "" : "s"}`
    : failed.length
      ? `${failed.length} upload${failed.length === 1 ? "" : "s"} failed`
      : `${done.length} upload${done.length === 1 ? "" : "s"} complete`;

  return (
    <section
      className="animate-rise fixed bottom-[140px] right-4 z-50 w-[calc(100%-32px)] max-w-[380px] overflow-hidden rounded-2xl border md:bottom-5 md:right-5"
      style={{
        background: "rgba(10,12,26,0.97)",
        borderColor: "rgba(186,215,247,0.12)",
        boxShadow: "0 24px 64px -16px rgba(0,0,0,0.8)",
        backdropFilter: "blur(16px)",
      }}
      aria-label="Uploads"
    >
      <header className="flex items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-white">{heading}</p>
          {active.length > 0 && (
            <p className="font-mono text-[11px] text-[var(--ak-fog)]">
              {overall}% · {formatBytes(sentBytes)} of {formatBytes(totalBytes)}
            </p>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex size-8 items-center justify-center rounded-full text-[var(--ak-fog)] transition-colors hover:bg-white/5 hover:text-white"
          aria-label={collapsed ? "Expand uploads" : "Collapse uploads"}
          aria-expanded={!collapsed}
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
        </button>
        {active.length === 0 && (
          <button
            onClick={clearFinishedUploads}
            className="flex size-8 items-center justify-center rounded-full text-[var(--ak-fog)] transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Dismiss uploads"
          >
            <X className="size-4" />
          </button>
        )}
      </header>

      {active.length > 0 && (
        <div className="h-0.5 w-full bg-white/[0.05]">
          <div
            className="h-full bg-[#663af3] transition-[width] duration-300"
            style={{ width: `${overall}%` }}
          />
        </div>
      )}

      {!collapsed && (
        <ul className="max-h-[320px] overflow-y-auto py-1">
          {uploads.map((u) => (
            <li key={u.id} className="group flex items-center gap-3 px-4 py-2.5">
              <FileIcon type={u.type} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-white">{u.name}</p>
                <p
                  className={cn(
                    "truncate font-mono text-[11px]",
                    u.stage === "failed" ? "text-[#fca5a5]" : "text-[var(--ak-fog)]",
                  )}
                  title={statusText(u)}
                >
                  {statusText(u)}
                </p>
                {(u.stage === "uploading" || u.stage === "distributing") && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-200",
                        u.stage === "distributing" ? "animate-pulse bg-teal" : "bg-[#8b6cf7]",
                      )}
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {u.stage === "complete" && (
                <Check className="size-4 shrink-0 text-teal" aria-label="Done" />
              )}
              {u.stage === "failed" && (
                <>
                  <CircleAlert className="size-4 shrink-0 text-[#fca5a5]" aria-hidden="true" />
                  <button
                    onClick={() => retryUpload(u.id)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--ak-fog)] hover:bg-white/5 hover:text-white"
                    aria-label={`Retry ${u.name}`}
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                </>
              )}
              {ACTIVE.has(u.stage) && (
                <button
                  onClick={() => cancelUpload(u.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--ak-fog)] hover:bg-white/5 hover:text-white"
                  aria-label={`Cancel ${u.name}`}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
