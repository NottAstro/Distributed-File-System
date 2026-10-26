import type { UploadRequest } from "./store";

/**
 * Helpers that turn browser file sources into UploadRequests.
 * Folder structure is kept as `relativePath` ("Photos/2024/a.jpg"); the
 * server recreates the folders on upload.
 */

/** Open the native picker. `folder: true` picks a whole directory. */
export function pickFiles(folder: boolean): Promise<UploadRequest[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    if (folder) {
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
    }
    input.style.display = "none";
    input.addEventListener("change", () => {
      resolve(fromFileList(input.files));
      input.remove();
    });
    input.addEventListener("cancel", () => {
      resolve([]);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

export function fromFileList(list: FileList | null): UploadRequest[] {
  if (!list) return [];
  return Array.from(list).map((file) => {
    // Set by <input webkitdirectory>: "Folder/sub/file.txt"
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    return rel && rel.includes("/") ? { file, relativePath: rel } : { file };
  });
}

/* ── Drag and drop (supports dropped folders) ───────────── */

type Entry = FileSystemEntry;

function readAllEntries(dir: FileSystemDirectoryEntry): Promise<Entry[]> {
  const reader = dir.createReader();
  const all: Entry[] = [];
  // readEntries returns at most ~100 entries per call — keep reading until empty
  return new Promise((resolve, reject) => {
    const next = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) resolve(all);
        else {
          all.push(...batch);
          next();
        }
      }, reject);
    next();
  });
}

function entryFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function walk(entry: Entry, prefix: string, out: UploadRequest[]) {
  if (entry.isFile) {
    const file = await entryFile(entry as FileSystemFileEntry);
    const relativePath = prefix ? `${prefix}/${file.name}` : undefined;
    out.push(relativePath ? { file, relativePath } : { file });
  } else if (entry.isDirectory) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    for (const child of await readAllEntries(entry as FileSystemDirectoryEntry)) {
      await walk(child, path, out);
    }
  }
}

/** Read a drop event, descending into any dropped folders. */
export async function fromDataTransfer(dt: DataTransfer): Promise<UploadRequest[]> {
  const entries = Array.from(dt.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.())
    .filter((e): e is Entry => Boolean(e));

  // Fallback for browsers without the entries API
  if (entries.length === 0) return fromFileList(dt.files);

  const out: UploadRequest[] = [];
  for (const entry of entries) await walk(entry, "", out);
  return out;
}

/** True when a drag carries files (not text/links dragged within the page). */
export function isFileDrag(e: DragEvent | React.DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}
