import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "image" | "video" | "audio" | "archive" | "code" | "sheet" | "doc" | "pdf" | "other";

const EXT: Record<string, Kind> = {};
const add = (kind: Kind, exts: string) => exts.split(" ").forEach((e) => (EXT[e] = kind));
add("image", "png jpg jpeg gif webp svg avif heic bmp ico tiff");
add("video", "mp4 mov mkv webm avi m4v");
add("audio", "mp3 wav flac aac ogg m4a");
add("archive", "zip rar 7z tar gz bz2 xz tgz");
add("code", "js ts tsx jsx py java c cpp h rs go rb php html css json xml yml yaml sh sql");
add("sheet", "csv xls xlsx ods tsv");
add("doc", "txt md doc docx rtf odt pages ppt pptx key");
add("pdf", "pdf");

const STYLE: Record<Kind, { icon: LucideIcon; color: string; bg: string }> = {
  image: { icon: FileImage, color: "#5eead4", bg: "rgba(45,212,191,0.10)" },
  video: { icon: FileVideo, color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
  audio: { icon: FileAudio, color: "#f0abfc", bg: "rgba(232,121,249,0.10)" },
  archive: { icon: FileArchive, color: "#fcd34d", bg: "rgba(251,191,36,0.10)" },
  code: { icon: FileCode, color: "#93c5fd", bg: "rgba(96,165,250,0.10)" },
  sheet: { icon: FileSpreadsheet, color: "#86efac", bg: "rgba(74,222,128,0.10)" },
  doc: { icon: FileText, color: "#c7d3ea", bg: "rgba(199,211,234,0.08)" },
  pdf: { icon: FileText, color: "#fca5a5", bg: "rgba(248,113,113,0.10)" },
  other: { icon: File, color: "#9da7ba", bg: "rgba(157,167,186,0.08)" },
};

export function kindOf(type: string): Kind {
  return EXT[type.toLowerCase()] ?? "other";
}

export function FileIcon({
  type,
  size = "md",
  className,
}: {
  type: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = STYLE[kindOf(type)];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" && "size-7",
        size === "md" && "size-9",
        size === "lg" && "size-14 rounded-xl",
        className,
      )}
      style={{ background: s.bg, color: s.color }}
      aria-hidden="true"
    >
      <Icon className={size === "lg" ? "size-7" : size === "md" ? "size-[18px]" : "size-3.5"} />
    </span>
  );
}

export function FolderIcon({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" && "size-7",
        size === "md" && "size-9",
        size === "lg" && "size-14 rounded-xl",
        className,
      )}
      style={{ background: "rgba(102,58,243,0.16)", color: "#b9a6ff" }}
      aria-hidden="true"
    >
      <Folder
        className={size === "lg" ? "size-7" : size === "md" ? "size-[18px]" : "size-3.5"}
        fill="currentColor"
        fillOpacity={0.25}
      />
    </span>
  );
}
