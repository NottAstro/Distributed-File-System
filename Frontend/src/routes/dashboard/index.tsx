/**
 * ──────────────────────────────────────────────────
 * index.tsx  —  MY FILES PAGE  (URL: /dashboard?folder=<id>)
 * ──────────────────────────────────────────────────
 * Folder browser. Shows the open folder's subfolders and
 * files (list or grid), breadcrumbs, search across every
 * folder, multi-select with bulk actions, and the file
 * detail slide-in. The open folder lives in the URL so
 * back/forward and shared links work.
 * ──────────────────────────────────────────────────
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronRight,
  Download,
  FileUp,
  FolderOpen,
  FolderPlus,
  FolderUp,
  Info,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, useWorkspace } from "@/components/dfs/AppShell";
import { FileDetailPanel } from "@/components/dfs/FileDetailPanel";
import { StatusDot } from "@/components/dfs/StatusDot";
import { FileIcon, FolderIcon } from "@/components/dfs/dashboard/FileIcon";
import { Menu } from "@/components/dfs/dashboard/Menu";
import { ConfirmDialog, PromptDialog } from "@/components/dfs/dashboard/Dialogs";
import { useDfs } from "@/lib/core/store";
import { cn } from "@/lib/utils";
import { formatBytes, formatRelative } from "@/lib/core/format";
import type { DfsFile, DfsFolder, FolderContents } from "@/lib/core/types";
import * as api from "@/lib/core/api";

const title = "My Files — DFS";
const description = "Browse, organise and download every file distributed across your DFS nodes.";

export const Route = createFileRoute("/dashboard/")({
  // Folder ids are numbers, so the URL reads ?folder=41 (a string id would be
  // JSON-encoded by the router as ?folder=%2241%22)
  validateSearch: (search: Record<string, unknown>): { folder?: number } => {
    const n = Number(search["folder"]);
    return Number.isInteger(n) && n > 0 ? { folder: n } : {};
  },
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

type SortKey = "name" | "date" | "size";
type View = "list" | "grid";
type DeleteTarget =
  | { kind: "file"; file: DfsFile }
  | { kind: "files"; files: DfsFile[] }
  | { kind: "folder"; folder: DfsFolder };

function usePref<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setValue(saved as T);
    } catch {
      /* ignore */
    }
  }, [key]);
  return [
    value,
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        /* ignore */
      }
    },
  ];
}

function compare(
  sort: SortKey,
  a: { name: string; size?: number | undefined; date: string },
  b: typeof a,
) {
  if (sort === "size") return (b.size ?? 0) - (a.size ?? 0);
  if (sort === "date") return new Date(b.date).getTime() - new Date(a.date).getTime();
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

/* ── Header: breadcrumbs ─────────────────────────────── */

function Breadcrumbs({ path }: { path: FolderContents["path"] }) {
  const crumbs = [{ id: null as string | null, name: "My Files" }, ...path];
  // On narrow screens collapse the middle of deep paths
  const collapsed = crumbs.length > 3 ? [crumbs[0]!, null, ...crumbs.slice(-2)] : crumbs;
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
      {collapsed.map((c, i) => {
        const last = i === collapsed.length - 1;
        return (
          <span key={c ? (c.id ?? "root") : "gap"} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-4 shrink-0 text-[var(--ak-fog)]/60" />}
            {c === null ? (
              <span className="text-[var(--ak-fog)]">…</span>
            ) : last ? (
              <span className="truncate" aria-current="page">
                {c.name}
              </span>
            ) : (
              <Link
                to="/dashboard"
                search={c.id ? { folder: Number(c.id) } : {}}
                className="truncate rounded-md px-1 text-[var(--ak-fog)] transition-colors hover:bg-white/5 hover:text-white"
              >
                {c.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* ── Stats strip (root only) ─────────────────────────── */

function StatsStrip() {
  const { files, folders, storage, nodes } = useDfs();
  const online = nodes.filter((n) => n.status === "online").length;
  const tiles = [
    { label: "Files", value: files.length.toLocaleString() },
    { label: "Folders", value: folders.length.toLocaleString() },
    { label: "Stored", value: storage ? formatBytes(storage.usedBytes) : "—" },
    {
      label: "Nodes online",
      value: nodes.length ? `${online}/${nodes.length}` : "—",
      tone: nodes.length && online < nodes.length ? "warn" : "ok",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border px-4 py-3.5"
          style={{ borderColor: "rgba(186,215,247,0.07)", background: "rgba(199,211,234,0.025)" }}
        >
          <p className="text-[12px] text-[var(--ak-fog)]">{t.label}</p>
          <p
            className={cn(
              "mt-1 font-[family-name:var(--font-display)] text-[22px] tracking-[-0.01em] text-white",
              t.tone === "warn" && "text-amber",
            )}
          >
            {t.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────── */

function EmptyState({ inFolder }: { inFolder: boolean }) {
  const ws = useWorkspace();
  return (
    <div
      className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-20 text-center"
      style={{ borderColor: "rgba(186,215,247,0.10)" }}
    >
      <span className="flex size-16 items-center justify-center rounded-2xl bg-[rgba(102,58,243,0.14)] text-[#b9a6ff]">
        <FolderOpen className="size-8" />
      </span>
      <p className="mt-5 text-[18px] font-medium text-white">
        {inFolder ? "This folder is empty" : "Nothing here yet"}
      </p>
      <p className="mt-1.5 max-w-[360px] text-[14px] text-[var(--ak-fog)]">
        Drag files or whole folders anywhere on this page, or use the buttons below.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <EmptyButton icon={FileUp} label="Upload files" onClick={ws.uploadFiles} primary />
        <EmptyButton icon={FolderUp} label="Upload folder" onClick={ws.uploadFolder} />
        <EmptyButton icon={FolderPlus} label="New folder" onClick={ws.newFolder} />
      </div>
    </div>
  );
}

function EmptyButton({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof FileUp;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[14px] font-medium transition-colors",
        primary
          ? "bg-[#663af3] text-white hover:bg-[#7450f5]"
          : "border border-white/[0.09] text-[var(--ak-moon)] hover:bg-white/[0.04] hover:text-white",
      )}
    >
      <Icon className="size-4" /> {label}
    </button>
  );
}

/* ── Folder card ─────────────────────────────────────── */

function FolderCard({
  folder,
  subtitle,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: DfsFolder;
  subtitle?: string | undefined;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-colors hover:border-[rgba(139,108,247,0.35)] hover:bg-[rgba(102,58,243,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6cf7]/50"
      style={{ borderColor: "rgba(186,215,247,0.07)", background: "rgba(199,211,234,0.025)" }}
    >
      <FolderIcon />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] text-white">{folder.name}</p>
        <p className="truncate text-[12px] text-[var(--ak-fog)]">
          {subtitle ??
            `${folder.itemCount ?? 0} item${folder.itemCount === 1 ? "" : "s"}${folder.size ? ` · ${formatBytes(folder.size)}` : ""}`}
        </p>
      </div>
      <Menu
        items={[
          { label: "Open", icon: FolderOpen, onSelect: onOpen },
          { label: "Rename", icon: Pencil, onSelect: onRename },
          null,
          { label: "Delete", icon: Trash2, danger: true, onSelect: onDelete },
        ]}
        trigger={
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--ak-fog)] opacity-0 transition-opacity hover:bg-white/5 hover:text-white focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
            aria-label={`Actions for ${folder.name}`}
          >
            <MoreHorizontal className="size-4" />
          </button>
        }
      />
    </div>
  );
}

/* ── File actions menu ───────────────────────────────── */

function FileMenu({
  file,
  onDetails,
  onDownload,
  onDelete,
  className,
}: {
  file: DfsFile;
  onDetails: () => void;
  onDownload: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <Menu
      items={[
        { label: "Download", icon: Download, onSelect: onDownload },
        { label: "Details", icon: Info, onSelect: onDetails },
        null,
        { label: "Delete", icon: Trash2, danger: true, onSelect: onDelete },
      ]}
      trigger={
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--ak-fog)] hover:bg-white/5 hover:text-white",
            className,
          )}
          aria-label={`Actions for ${file.name}`}
        >
          <MoreHorizontal className="size-4" />
        </button>
      }
    />
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
        checked
          ? "border-[#8b6cf7] bg-[#663af3] text-white"
          : "border-white/20 hover:border-white/40",
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

/* ── Page ────────────────────────────────────────────── */

function FilesPage() {
  const { folder } = Route.useSearch();
  const folderId = folder ? String(folder) : undefined;
  const navigate = useNavigate();
  const {
    files: allFiles,
    folders: allFolders,
    contentVersion,
    removeFile,
    removeFolder,
    renameFolder,
    download,
    downloading,
  } = useDfs();

  const [contents, setContents] = useState<FolderContents | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = usePref<View>("dfs.view", "list");
  const [sort, setSort] = usePref<SortKey>("dfs.sort", "name");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<DfsFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [renameTarget, setRenameTarget] = useState<DfsFolder | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load the open folder (and reload whenever anything changes)
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    api
      .getFolderContents(folderId ?? null)
      .then((c) => !cancelled && setContents(c))
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [folderId, contentVersion]);

  // Reset selection and search when changing folders
  useEffect(() => {
    setSelected(new Set());
    setQuery("");
    setContents((c) => (c && (c.folder?.id ?? undefined) === folderId ? c : null));
  }, [folderId]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/input|textarea/i.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openFolder = (id: string | null) =>
    void navigate({ to: "/dashboard", search: id ? { folder: Number(id) } : {} });

  // Folder id → "Parent / Child" for search results
  const folderPath = useMemo(() => {
    const byId = new Map(allFolders.map((f) => [f.id, f]));
    return (id: string | null): string => {
      const parts: string[] = [];
      let cur = id ? byId.get(id) : undefined;
      for (let guard = 0; cur && guard < 40; guard++) {
        parts.unshift(cur.name);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return parts.length ? `My Files / ${parts.join(" / ")}` : "My Files";
    };
  }, [allFolders]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const visibleFolders = useMemo(() => {
    const list = searching
      ? allFolders.filter((f) => f.name.toLowerCase().includes(q))
      : (contents?.folders ?? []);
    return [...list].sort((a, b) =>
      compare(
        sort,
        { name: a.name, size: a.size, date: a.updatedAt },
        { name: b.name, size: b.size, date: b.updatedAt },
      ),
    );
  }, [searching, allFolders, q, contents, sort]);

  const visibleFiles = useMemo(() => {
    const list = searching
      ? allFiles.filter((f) => f.name.toLowerCase().includes(q))
      : (contents?.files ?? []);
    return [...list].sort((a, b) =>
      compare(
        sort,
        { name: a.name, size: a.size, date: a.uploadedAt },
        { name: b.name, size: b.size, date: b.uploadedAt },
      ),
    );
  }, [searching, allFiles, q, contents, sort]);

  const selectedFiles = visibleFiles.filter((f) => selected.has(f.id));
  const allSelected = visibleFiles.length > 0 && selectedFiles.length === visibleFiles.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const doDownload = (file: DfsFile) =>
    download(file)
      .then(() => toast.success(`Downloaded ${file.name}`))
      .catch((e: Error) => toast.error(`${file.name}: ${e.message}`));

  const loading = !contents && !loadError;
  const isEmpty =
    !searching && contents && contents.folders.length === 0 && contents.files.length === 0;

  return (
    <AppShell
      title={contents ? <Breadcrumbs path={contents.path} /> : folderId ? "…" : "My Files"}
      actions={
        <>
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ak-fog)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder="Search all files"
              aria-label="Search all files and folders"
              className="ak-input h-10 w-[240px] pl-9 pr-9 text-[14px] placeholder:text-[var(--ak-fog)]/70 lg:w-[300px]"
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-[var(--ak-fog)] hover:text-white"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 font-mono text-[10px] text-[var(--ak-fog)]">
                /
              </kbd>
            )}
          </div>
        </>
      }
    >
      <div className="mx-auto max-w-[1280px] space-y-7">
        {/* mobile search */}
        <div className="relative sm:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ak-fog)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all files"
            aria-label="Search all files and folders"
            className="ak-input h-11 w-full pl-9 pr-3 text-[15px]"
          />
        </div>

        {!folderId && !searching && <StatsStrip />}

        {loadError && (
          <div className="rounded-2xl border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.05)] px-5 py-8 text-center">
            <p className="text-[15px] text-white">{loadError}</p>
            <button
              onClick={() => openFolder(null)}
              className="mt-3 text-[14px] text-[#b9a6ff] hover:underline"
            >
              Back to My Files
            </button>
          </div>
        )}

        {/* toolbar */}
        {!loadError && !isEmpty && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-[var(--ak-fog)]">
              {searching
                ? `${visibleFolders.length + visibleFiles.length} result${visibleFolders.length + visibleFiles.length === 1 ? "" : "s"} for “${query.trim()}”`
                : contents
                  ? `${contents.folders.length} folder${contents.folders.length === 1 ? "" : "s"} · ${contents.files.length} file${contents.files.length === 1 ? "" : "s"}`
                  : ""}
            </p>
            <div className="flex items-center gap-1">
              <Menu
                items={(
                  [
                    ["name", "Name"],
                    ["date", "Last modified"],
                    ["size", "Size"],
                  ] as const
                ).map(([key, label]) => ({
                  label,
                  icon: sort === key ? Check : undefined,
                  onSelect: () => setSort(key),
                }))}
                trigger={
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] text-[var(--ak-moon)] hover:bg-white/5 hover:text-white">
                    <ArrowDownUp className="size-3.5" />
                    {sort === "name" ? "Name" : sort === "date" ? "Last modified" : "Size"}
                  </button>
                }
              />
              <div
                className="ml-1 flex rounded-lg border border-white/[0.08] p-0.5"
                role="group"
                aria-label="View"
              >
                {(
                  [
                    ["list", List],
                    ["grid", LayoutGrid],
                  ] as const
                ).map(([key, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    aria-pressed={view === key}
                    aria-label={`${key} view`}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md transition-colors",
                      view === key
                        ? "bg-white/[0.08] text-white"
                        : "text-[var(--ak-fog)] hover:text-white",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2" aria-busy="true" aria-label="Loading">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-white/[0.03]"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}

        {isEmpty && <EmptyState inFolder={Boolean(folderId)} />}

        {searching && visibleFolders.length + visibleFiles.length === 0 && (
          <p className="py-16 text-center text-[15px] text-[var(--ak-fog)]">
            No files or folders match “{query.trim()}”.
          </p>
        )}

        {/* folders */}
        {visibleFolders.length > 0 && (
          <section aria-label="Folders">
            <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--ak-fog)]">
              Folders
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleFolders.map((f) => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  subtitle={searching ? folderPath(f.parentId) : undefined}
                  onOpen={() => openFolder(f.id)}
                  onRename={() => setRenameTarget(f)}
                  onDelete={() => setDeleteTarget({ kind: "folder", folder: f })}
                />
              ))}
            </div>
          </section>
        )}

        {/* files */}
        {visibleFiles.length > 0 && (
          <section aria-label="Files">
            <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--ak-fog)]">
              Files
            </h2>

            {view === "list" ? (
              <div
                className="overflow-hidden rounded-2xl border"
                style={{
                  borderColor: "rgba(186,215,247,0.07)",
                  background: "rgba(199,211,234,0.02)",
                }}
              >
                <div className="hidden items-center gap-4 border-b border-white/[0.06] px-4 py-2.5 text-[12px] text-[var(--ak-fog)] md:flex">
                  <Checkbox
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(visibleFiles.map((f) => f.id)))
                    }
                    label="Select all files"
                  />
                  <span className="flex-1">Name</span>
                  <span className="w-[90px] text-right">Size</span>
                  <span className="w-[120px]">Modified</span>
                  <span className="w-[110px]">Status</span>
                  <span className="w-8" />
                </div>
                <ul>
                  {visibleFiles.map((file) => {
                    const isSel = selected.has(file.id);
                    const dl = downloading[file.id];
                    return (
                      <li
                        key={file.id}
                        onClick={() => setDetail(file)}
                        className={cn(
                          "group flex cursor-pointer items-center gap-4 border-b border-white/[0.04] px-4 py-2.5 transition-colors last:border-0",
                          isSel ? "bg-[rgba(102,58,243,0.08)]" : "hover:bg-white/[0.025]",
                        )}
                      >
                        <span className="hidden md:block">
                          <Checkbox
                            checked={isSel}
                            onChange={() => toggle(file.id)}
                            label={`Select ${file.name}`}
                          />
                        </span>
                        <FileIcon type={file.type} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] text-white">{file.name}</p>
                          <p className="truncate text-[12px] text-[var(--ak-fog)] md:hidden">
                            {formatBytes(file.size)} · {formatRelative(file.uploadedAt)}
                          </p>
                          {searching && (
                            <p className="truncate text-[12px] text-[var(--ak-fog)]">
                              {folderPath(file.folderId)}
                            </p>
                          )}
                          {dl !== undefined && (
                            <div className="mt-1 h-0.5 max-w-[200px] rounded bg-white/5">
                              <div className="h-full bg-[#8b6cf7]" style={{ width: `${dl}%` }} />
                            </div>
                          )}
                        </div>
                        <span className="hidden w-[90px] text-right font-mono text-[12px] text-[var(--ak-moon)] md:block">
                          {formatBytes(file.size)}
                        </span>
                        <span className="hidden w-[120px] text-[13px] text-[var(--ak-fog)] md:block">
                          {formatRelative(file.uploadedAt)}
                        </span>
                        <span className="hidden w-[110px] md:block">
                          <StatusDot status={file.status} className="text-[13px]" />
                        </span>
                        <FileMenu
                          file={file}
                          onDetails={() => setDetail(file)}
                          onDownload={() => void doDownload(file)}
                          onDelete={() => setDeleteTarget({ kind: "file", file })}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visibleFiles.map((file) => {
                  const isSel = selected.has(file.id);
                  return (
                    <div
                      key={file.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetail(file)}
                      onKeyDown={(e) => e.key === "Enter" && setDetail(file)}
                      className={cn(
                        "group relative flex cursor-pointer flex-col rounded-2xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6cf7]/50",
                        isSel
                          ? "border-[rgba(139,108,247,0.5)] bg-[rgba(102,58,243,0.08)]"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={cn(
                            "transition-opacity",
                            !isSel && "opacity-0 group-hover:opacity-100 max-md:opacity-100",
                          )}
                        >
                          <Checkbox
                            checked={isSel}
                            onChange={() => toggle(file.id)}
                            label={`Select ${file.name}`}
                          />
                        </span>
                        <FileMenu
                          file={file}
                          className="-mr-1 -mt-1"
                          onDetails={() => setDetail(file)}
                          onDownload={() => void doDownload(file)}
                          onDelete={() => setDeleteTarget({ kind: "file", file })}
                        />
                      </div>
                      <div className="flex justify-center py-5">
                        <FileIcon type={file.type} size="lg" />
                      </div>
                      <p className="truncate text-[13px] text-white">{file.name}</p>
                      <p className="truncate text-[12px] text-[var(--ak-fog)]">
                        {searching
                          ? folderPath(file.folderId)
                          : `${formatBytes(file.size)} · ${formatRelative(file.uploadedAt)}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* selection bar */}
      {selectedFiles.length > 0 && (
        <div className="animate-rise fixed bottom-[140px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/[0.1] bg-[rgba(14,16,34,0.97)] p-1.5 pl-4 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8)] md:bottom-6">
          <span className="mr-2 text-[14px] text-white">{selectedFiles.length} selected</span>
          <button
            onClick={() => selectedFiles.forEach((f) => void doDownload(f))}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] text-[var(--ak-moon)] hover:bg-white/5 hover:text-white"
          >
            <Download className="size-4" /> Download
          </button>
          <button
            onClick={() => setDeleteTarget({ kind: "files", files: selectedFiles })}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] text-[#fca5a5] hover:bg-[rgba(248,113,113,0.08)]"
          >
            <Trash2 className="size-4" /> Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="flex size-9 items-center justify-center rounded-lg text-[var(--ak-fog)] hover:bg-white/5 hover:text-white"
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {detail && (
        <FileDetailPanel
          file={detail}
          onClose={() => setDetail(null)}
          onDelete={(file) => setDeleteTarget({ kind: "file", file })}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={
          deleteTarget?.kind === "folder"
            ? `Delete “${deleteTarget.folder.name}”?`
            : deleteTarget?.kind === "files"
              ? `Delete ${deleteTarget.files.length} files?`
              : `Delete “${deleteTarget?.kind === "file" ? deleteTarget.file.name : ""}”?`
        }
        description={
          deleteTarget?.kind === "folder"
            ? "The folder and everything inside it — subfolders and files — will be permanently removed from every node."
            : "Their chunks are permanently removed from every node. This can't be undone."
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            if (deleteTarget.kind === "folder") {
              const r = await removeFolder(deleteTarget.folder.id);
              toast.success(
                `Deleted “${deleteTarget.folder.name}”${r.files ? ` and ${r.files} file${r.files === 1 ? "" : "s"}` : ""}`,
              );
            } else {
              const targets =
                deleteTarget.kind === "file" ? [deleteTarget.file] : deleteTarget.files;
              const results = await Promise.allSettled(targets.map((f) => removeFile(f.id)));
              const failed = results.filter((r) => r.status === "rejected").length;
              if (failed) toast.error(`${failed} of ${targets.length} could not be deleted`);
              else
                toast.success(
                  targets.length === 1
                    ? `Deleted ${targets[0]!.name}`
                    : `Deleted ${targets.length} files`,
                );
              setSelected(new Set());
              if (detail && targets.some((t) => t.id === detail.id)) setDetail(null);
            }
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />

      <PromptDialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title="Rename folder"
        label="Folder name"
        initialValue={renameTarget?.name ?? ""}
        submitLabel="Rename"
        onSubmit={async (name) => {
          if (!renameTarget || name === renameTarget.name) return;
          await renameFolder(renameTarget.id, name);
          toast.success(`Renamed to “${name}”`);
        }}
      />
    </AppShell>
  );
}
