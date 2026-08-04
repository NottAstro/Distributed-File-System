import { FileTypeIcon } from "./Logo";
import { Lock, ShieldCheck, Download } from "lucide-react";

function UploadPreview() {
  return (
    <div className="border border-border bg-elevated p-5">
      <div className="flex items-center gap-3">
        <FileTypeIcon type="pdf" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px]">q3-architecture-review.pdf</p>
          <p className="font-mono text-[12px] text-faint">12.4 MB</p>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-teal">
          <Lock className="size-3" /> AES-256
        </span>
      </div>
      <div className="mt-4 h-1 w-full bg-surface">
        <div className="h-full w-[68%] bg-teal" />
      </div>
      <p className="mt-2 font-mono text-[12px] text-faint">Distributing… 68%</p>
    </div>
  );
}

function NodeMapPreview() {
  return (
    <div className="border border-border bg-elevated p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint">Chunk placement</p>
      <div className="mt-4 grid grid-cols-8 gap-1.5">
        {Array.from({ length: 32 }).map((_, i) => (
          <span
            key={i}
            className={
              i % 5 === 0
                ? "aspect-square bg-accent/80"
                : i % 3 === 0
                  ? "aspect-square bg-teal/70"
                  : "aspect-square bg-surface"
            }
          />
        ))}
      </div>
      <div className="mt-4 flex justify-between font-mono text-[12px] text-faint">
        <span>4 chunks</span>
        <span>3 nodes · eu-central, us-east, ap-south</span>
      </div>
    </div>
  );
}

function DownloadPreview() {
  return (
    <div className="border border-border bg-elevated p-5">
      <div className="flex items-center gap-3">
        <FileTypeIcon type="zip" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px]">cluster-backup-2026-07.zip</p>
          <p className="font-mono text-[12px] text-faint">842 MB · 96 chunks</p>
        </div>
        <Download className="size-4 text-faint" />
      </div>
      <div className="mt-4 h-1 w-full bg-surface">
        <div className="h-full w-[92%] bg-teal" />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[12px]">
        <span className="text-faint">Reassembling chunks…</span>
        <span className="text-teal">92%</span>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    id: "security",
    overline: "Secure Upload",
    title: "Encrypted before it ever leaves your device.",
    body: "Files are encrypted client-side with AES-256, then split into chunks. No node ever holds a readable copy.",
    caption: "Zero-knowledge key handling",
    visual: <UploadPreview />,
  },
  {
    id: "distribution",
    overline: "Distributed Storage",
    title: "Chunks spread across independent nodes.",
    body: "Placement is redundancy-aware — losing an entire region still leaves your file fully reconstructible.",
    caption: "3× replication factor by default",
    visual: <NodeMapPreview />,
  },
  {
    id: "retrieval",
    overline: "Instant Download",
    title: "Reassembled and decrypted on demand.",
    body: "The coordinator pulls the nearest healthy chunks in parallel and streams the file back in under 200ms.",
    caption: "Parallel chunk fetch",
    visual: <DownloadPreview />,
  },
];

export function Features() {
  return (
    <section id="security" className="border-t border-border py-20 md:py-[80px]">
      <div className="mx-auto max-w-[1200px] space-y-20 px-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-4 text-accent" />
          <p className="text-overline text-faint">Built for durability</p>
        </div>

        {FEATURES.map((feature, i) => (
          <div
            key={feature.id}
            className="grid items-center gap-10 md:grid-cols-2 md:gap-[24px] lg:gap-16"
          >
            <div className={i % 2 === 1 ? "md:order-2" : ""}>
              <p className="text-overline text-accent">{feature.overline}</p>
              <h3 className="mt-4 max-w-[420px] text-[24px] font-medium leading-[1.3] tracking-[-0.01em]">
                {feature.title}
              </h3>
              <p className="mt-4 max-w-[460px] text-[16px] leading-[1.5] text-muted-foreground">
                {feature.body}
              </p>
              <p className="mt-4 font-mono text-[12px] text-faint">{feature.caption}</p>
            </div>
            <div className={i % 2 === 1 ? "md:order-1" : ""}>{feature.visual}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
