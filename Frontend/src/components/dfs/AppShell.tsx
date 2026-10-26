// Layout of the dashboard after login
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronsUpDown,
  CloudUpload,
  Download,
  FileUp,
  FolderPlus,
  FolderUp,
  HardDrive,
  LogOut,
  Plus,
  Settings,
  Files,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDfs, type UploadRequest } from "@/lib/core/store";
import { formatBytes, initials } from "@/lib/core/format";
import { fromDataTransfer, isFileDrag, pickFiles } from "@/lib/core/pick";
import { Logo } from "./Logo";
import { Menu, type MenuItem } from "./dashboard/Menu";
import { PromptDialog } from "./dashboard/Dialogs";
import { UploadTray } from "./dashboard/UploadTray";

const NAV = [
  { label: "My Files", to: "/dashboard", icon: Files },
  { label: "Downloads", to: "/dashboard/downloads", icon: Download },
  { label: "Storage", to: "/dashboard/storage", icon: HardDrive },
  { label: "Settings", to: "/dashboard/settings", icon: Settings },
] as const;

/* ── Workspace context: "where am I, and how do I add things here" ── */

interface Workspace {
  /** folder currently open on My Files (null = root or another page) */
  folderId: string | null;
  newFolder: () => void;
  uploadFiles: () => void;
  uploadFolder: () => void;
}

const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <AppShell>");
  return ctx;
}

function StorageCard() {
  const { storage, nodes } = useDfs();
  const online = nodes.filter((n) => n.status === "online").length;
  const ratio = storage?.quotaBytes ? Math.min(storage.usedBytes / storage.quotaBytes, 1) : 0;
  const healthy = nodes.length > 0 && online === nodes.length;

  return (
    <Link
      to="/dashboard/storage"
      className="block rounded-xl border p-3.5 transition-colors hover:bg-white/[0.03]"
      style={{ borderColor: "rgba(186,215,247,0.08)", background: "rgba(199,211,234,0.03)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--ak-fog)]">
          Storage
        </span>
        <span className="font-mono text-[11px] text-[var(--ak-fog)]">
          {Math.round(ratio * 100)}%
        </span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            ratio >= 0.9 ? "bg-destructive" : ratio >= 0.75 ? "bg-amber" : "bg-[#8b6cf7]",
          )}
          style={{ width: `${Math.max(ratio * 100, storage?.usedBytes ? 2 : 0)}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-[11px] text-[var(--ak-fog)]">
        {storage ? `${formatBytes(storage.usedBytes)} of ${formatBytes(storage.quotaBytes)}` : "—"}
      </p>
      {nodes.length > 0 && (
        <p className="mt-2.5 flex items-center gap-2 border-t border-white/[0.06] pt-2.5 text-[12px] text-[var(--ak-moon)]">
          <span
            className={cn(
              "size-1.5 rounded-full",
              healthy ? "bg-teal" : "bg-amber animate-pulse-dot",
            )}
          />
          {online}/{nodes.length} nodes online
        </p>
      )}
    </Link>
  );
}

function Avatar({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | undefined;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return url && !broken ? (
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={cn("size-8 shrink-0 rounded-full object-cover", className)}
    />
  ) : (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-[12px] text-white",
        className,
      )}
      style={{ background: "linear-gradient(135deg,#663af3,#2dd4bf)" }}
    >
      {initials(name) || "?"}
    </span>
  );
}

export function AppShell({
  title,
  actions,
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, authReady, signOut, enqueue, createFolder, folders } = useDfs();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });
  const pathname = location.pathname.replace(/\/$/, "") || "/";
  const onFilesPage = pathname === "/dashboard";
  const searchFolder = (location.search as { folder?: number }).folder;
  const folderId = onFilesPage && searchFolder ? String(searchFolder) : null;
  const folderName = folderId
    ? (folders.find((f) => f.id === folderId)?.name ?? "this folder")
    : "My Files";

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const dragging = dragDepth > 0;

  useEffect(() => {
    if (authReady && !user) void navigate({ to: "/signin" });
  }, [authReady, user, navigate]);

  const addUploads = useCallback(
    (items: UploadRequest[]) => {
      if (items.length === 0) return;
      enqueue(items, folderId);
    },
    [enqueue, folderId],
  );

  const workspace = useMemo<Workspace>(
    () => ({
      folderId,
      newFolder: () => setNewFolderOpen(true),
      uploadFiles: () => void pickFiles(false).then(addUploads),
      uploadFolder: () => void pickFiles(true).then(addUploads),
    }),
    [folderId, addUploads],
  );

  const newItems: MenuItem[] = [
    { label: "New folder", icon: FolderPlus, onSelect: workspace.newFolder },
    { label: "Upload files", icon: FileUp, onSelect: workspace.uploadFiles },
    { label: "Upload folder", icon: FolderUp, onSelect: workspace.uploadFolder },
  ];

  // Reading a dropped folder can take a moment for big trees
  const reading = useRef(false);

  if (!authReady || !user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#05060f" }}
      >
        <p className="font-mono text-[12px] text-faint">Restoring session…</p>
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider value={workspace}>
      <div
        className="relative flex min-h-screen w-full"
        style={{ background: "#05060f" }}
        onDragEnter={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setDragDepth((d) => d + 1);
        }}
        onDragOver={(e) => {
          if (isFileDrag(e)) e.preventDefault();
        }}
        onDragLeave={(e) => {
          if (isFileDrag(e)) setDragDepth((d) => Math.max(0, d - 1));
        }}
        onDrop={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setDragDepth(0);
          if (reading.current) return;
          reading.current = true;
          fromDataTransfer(e.dataTransfer)
            .then(addUploads)
            .catch(() => toast.error("Couldn't read the dropped items"))
            .finally(() => (reading.current = false));
        }}
      >
        {/* ambient glow */}
        <div
          className="pointer-events-none fixed inset-0 z-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(900px 500px at 12% -10%, rgba(102,58,243,0.10), transparent 60%), radial-gradient(700px 400px at 100% 0%, rgba(45,212,191,0.05), transparent 60%)",
          }}
        />

        {/* ── Sidebar ───────────────────────────────────── */}
        <aside
          className="sticky top-0 z-20 hidden h-screen w-[256px] shrink-0 flex-col border-r px-3 pb-3 md:flex"
          style={{ borderRightColor: "rgba(186,215,247,0.07)", background: "rgba(7,8,20,0.6)" }}
        >
          <div className="flex h-[68px] items-center px-2">
            <Link to="/" className="text-foreground">
              <Logo />
            </Link>
          </div>

          <Menu
            align="start"
            items={newItems}
            className="w-[232px]"
            trigger={
              <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#663af3] text-[14px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(102,58,243,0.7)] transition-all hover:bg-[#7450f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b6cf7]/60">
                <Plus className="size-4" /> New
              </button>
            }
          />

          <nav className="mt-5 flex flex-col gap-0.5" aria-label="Dashboard">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors",
                    active
                      ? "bg-white/[0.06] font-medium text-white"
                      : "text-[var(--ak-fog)] hover:bg-white/[0.03] hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className={cn("size-[18px] shrink-0", active && "text-[#b9a6ff]")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3">
            <StorageCard />
            <Menu
              align="start"
              side="top"
              className="w-[232px]"
              items={[
                {
                  label: "Settings",
                  icon: Settings,
                  onSelect: () => void navigate({ to: "/dashboard/settings" }),
                },
                null,
                { label: "Sign out", icon: LogOut, danger: true, onSelect: () => void signOut() },
              ]}
              trigger={
                <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/[0.04]">
                  <Avatar name={user.name} url={user.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-white">{user.name}</span>
                    <span className="block truncate text-[12px] text-[var(--ak-fog)]">
                      {user.email}
                    </span>
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 text-[var(--ak-fog)]" />
                </button>
              }
            />
          </div>
        </aside>

        {/* ── Main column ───────────────────────────────── */}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <header
            className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-3 border-b px-4 md:px-8"
            style={{
              background: "rgba(5,6,15,0.8)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderBottomColor: "rgba(186,215,247,0.07)",
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to="/"
                className="shrink-0 text-foreground md:hidden"
                aria-label="upLoader home"
              >
                <Logo mark={false} />
              </Link>
              <div className="min-w-0 text-[18px] font-medium tracking-[-0.01em] text-white md:text-[20px]">
                {title}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          </header>

          <main className="flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10 md:pt-8">{children}</main>

          {/* mobile bottom nav */}
          <nav
            className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t md:hidden"
            style={{
              background: "rgba(5,6,15,0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderTopColor: "rgba(186,215,247,0.08)",
            }}
            aria-label="Dashboard"
          >
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                  pathname === item.to ? "text-white" : "text-[var(--ak-fog)]",
                )}
              >
                <item.icon className="size-[18px]" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* mobile New button */}
          <div className="fixed bottom-[72px] right-4 z-40 md:hidden">
            <Menu
              side="top"
              items={newItems}
              trigger={
                <button
                  className="flex size-14 items-center justify-center rounded-2xl bg-[#663af3] text-white shadow-[0_12px_32px_-8px_rgba(102,58,243,0.8)]"
                  aria-label="New"
                >
                  <Plus className="size-6" />
                </button>
              }
            />
          </div>
        </div>

        {/* drop overlay */}
        {dragging && (
          <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-[#05060f]/75 p-6 backdrop-blur-[2px]">
            <div className="flex w-full max-w-[520px] flex-col items-center rounded-3xl border-2 border-dashed border-[#8b6cf7]/70 bg-[rgba(102,58,243,0.08)] px-8 py-14 text-center">
              <CloudUpload className="size-10 text-[#b9a6ff]" />
              <p className="mt-4 text-[18px] font-medium text-white">Drop to upload</p>
              <p className="mt-1 text-[14px] text-[var(--ak-fog)]">
                Files and folders go into <span className="text-white">{folderName}</span>
              </p>
            </div>
          </div>
        )}

        <UploadTray />

        <PromptDialog
          open={newFolderOpen}
          onOpenChange={setNewFolderOpen}
          title="New folder"
          label={`Create in ${folderName}`}
          initialValue="Untitled folder"
          submitLabel="Create"
          onSubmit={async (name) => {
            await createFolder(name, folderId);
            toast.success(`Created “${name}”`);
          }}
        />
      </div>
    </WorkspaceContext.Provider>
  );
}
