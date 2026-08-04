import { Download, Share2, Trash2 } from "lucide-react";
import { Button } from "./Button";
import { FileTypeIcon } from "./Logo";
import { StatusDot } from "./StatusDot";
import { formatBytes, formatDate } from "@/lib/dfs/format";
import type { DfsFile } from "@/lib/dfs/types";

export function FileTable({
  files,
  onSelect,
  onDelete,
  onDownload,
  onShare,
}: {
  files: DfsFile[];
  onSelect: (file: DfsFile) => void;
  onDelete: (id: string) => void;
  onDownload: (file: DfsFile) => void;
  onShare: (file: DfsFile) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {["Name", "Size", "Type", "Uploaded", "Status", ""].map((h) => (
              <th
                key={h}
                className="py-3 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-faint"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr
              key={file.id}
              onClick={() => onSelect(file)}
              className="group h-[52px] cursor-pointer border-b border-border transition-colors duration-200 hover:bg-hover"
            >
              <td className="max-w-[280px] py-3 pr-4">
                <span className="flex items-center gap-3">
                  <FileTypeIcon type={file.type} />
                  <span className="truncate text-[14px]">{file.name}</span>
                </span>
              </td>
              <td className="py-3 pr-4 font-mono text-[13px] text-muted-foreground">
                {formatBytes(file.size)}
              </td>
              <td className="py-3 pr-4 font-mono text-[13px] uppercase text-faint">{file.type}</td>
              <td className="py-3 pr-4 font-mono text-[13px] text-muted-foreground">
                {formatDate(file.uploadedAt)}
              </td>
              <td className="py-3 pr-4">
                <StatusDot status={file.status} />
              </td>
              <td className="py-3">
                <span
                  className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="icon" aria-label="Download" onClick={() => onDownload(file)}>
                    <Download className="size-4" />
                  </Button>
                  <Button variant="icon" aria-label="Share" onClick={() => onShare(file)}>
                    <Share2 className="size-4" />
                  </Button>
                  <Button
                    variant="icon"
                    aria-label="Delete"
                    className="hover:text-destructive"
                    onClick={() => onDelete(file.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
