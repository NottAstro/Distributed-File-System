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
import { toast } from "sonner";
import * as api from "./api";
import type {
  DfsFile,
  DfsFolder,
  DfsUser,
  DownloadRecord,
  StorageNode,
  StorageUsage,
  UploadItem,
} from "./types";
import { extensionOf } from "./format";

/**
 * Client-side app state: auth, the user's files/folders, the upload queue
 * and download history. Pages read from here and call api.ts through it.
 */

const SESSION_KEY = "dfs.session";
const DOWNLOADS_KEY = "dfs.downloads";
const MAX_PARALLEL_UPLOADS = 3;

export interface UploadRequest {
  file: File;
  /** path inside a picked/dropped folder, e.g. "Photos/2024/a.jpg" */
  relativePath?: string;
}

interface DfsContextValue {
  user: DfsUser | null;
  authReady: boolean;
  /** sign-in methods the server supports; null until loaded (or if unreachable) */
  authConfig: api.AuthConfig | null;
  /** set when the server couldn't be reached to load authConfig */
  authConfigError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  googleSignIn: (credential: string) => Promise<void>;
  otpRequest: (email: string) => Promise<void>;
  otpVerify: (email: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;

  /** every file / folder the user owns (for search, storage stats) */
  files: DfsFile[];
  folders: DfsFolder[];
  filesLoading: boolean;
  refreshFiles: () => Promise<void>;
  /** bumps whenever files or folders change — folder views refetch on it */
  contentVersion: number;

  removeFile: (id: string) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<DfsFolder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  removeFolder: (id: string) => Promise<{ folders: number; files: number }>;

  storage: StorageUsage | null;
  nodes: StorageNode[];

  uploads: UploadItem[];
  enqueue: (items: UploadRequest[], folderId: string | null) => void;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  clearFinishedUploads: () => void;

  downloads: DownloadRecord[];
  /** id → 0-100 for downloads in flight */
  downloading: Record<string, number>;
  download: (file: DfsFile) => Promise<void>;
}

const DfsContext = createContext<DfsContextValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function DfsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DfsUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authConfig, setAuthConfig] = useState<api.AuthConfig | null>(null);
  const [authConfigError, setAuthConfigError] = useState<string | null>(null);
  const [files, setFiles] = useState<DfsFile[]>([]);
  const [folders, setFolders] = useState<DfsFolder[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});

  const handles = useRef(new Map<string, api.UploadHandle>());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((next: DfsUser | null) => {
    setUser(next);
    writeJson(SESSION_KEY, next);
  }, []);

  useEffect(() => {
    setDownloads(readJson<DownloadRecord[]>(DOWNLOADS_KEY, []));

    // Restore the cached user for an instant first paint, then confirm the
    // session with the server. A cached user without a token (or a token the
    // server rejects — handled by the 401 listener) is signed out.
    const cached = readJson<DfsUser | null>(SESSION_KEY, null);
    if (cached && api.hasToken()) {
      setUser(cached);
      api
        .getProfile()
        .then(persist)
        .catch(() => {
          /* 401 → signed out by the listener; offline → keep the cached user */
        });
    } else if (cached) {
      persist(null);
    }
    setAuthReady(true);

    api
      .getAuthConfig()
      .then((c) => {
        setAuthConfig(c);
        setAuthConfigError(null);
      })
      .catch((e: unknown) => setAuthConfigError(api.errorMessage(e)));
  }, [persist]);

  const resetData = useCallback(() => {
    handles.current.forEach((h) => h.abort());
    handles.current.clear();
    setFiles([]);
    setFolders([]);
    setUploads([]);
    setStorage(null);
    setNodes([]);
  }, []);

  // An expired/invalid token used to leave the dashboard "signed in" with
  // every request failing. Any 401 now signs the user out.
  useEffect(() => {
    const onUnauthorized = () => {
      void api.signOut();
      resetData();
      persist(null);
      toast.error("Your session expired. Please sign in again.", { id: "session-expired" });
    };
    window.addEventListener(api.UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(api.UNAUTHORIZED_EVENT, onUnauthorized);
  }, [persist, resetData]);

  const refreshFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const [fileList, folderList, usage, nodeList] = await Promise.all([
        api.listFiles(),
        api.listFolders(),
        api.getStorage(),
        api.getNodes(),
      ]);
      setFiles(fileList);
      setFolders(folderList);
      setStorage(usage);
      setNodes(nodeList);
    } catch (err) {
      console.error("Failed to refresh files:", err);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  /** Coalesce many quick changes (e.g. a 200-file folder upload) into one refresh. */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      setContentVersion((v) => v + 1);
      void refreshFiles();
    }, 500);
  }, [refreshFiles]);

  useEffect(() => {
    if (user) void refreshFiles();
  }, [user, refreshFiles]);

  /* ── Upload queue ─────────────────────────────────────── */

  const patchUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const startUpload = useCallback(
    (item: UploadItem) => {
      const handle = api.uploadFile(
        item.file,
        { folderId: item.folderId, relativePath: item.relativePath },
        (progress, stage) => patchUpload(item.id, { progress, stage }),
      );
      handles.current.set(item.id, handle);
      patchUpload(item.id, { stage: "uploading", progress: 0, error: undefined });

      handle.promise
        .then(() => {
          patchUpload(item.id, { stage: "complete", progress: 100 });
          scheduleRefresh();
        })
        .catch((err: unknown) => {
          const aborted = err instanceof DOMException && err.name === "AbortError";
          patchUpload(item.id, {
            stage: aborted ? "cancelled" : "failed",
            error: aborted ? undefined : err instanceof Error ? err.message : "Upload failed",
          });
        })
        .finally(() => handles.current.delete(item.id));
    },
    [patchUpload, scheduleRefresh],
  );

  // Pump: keep up to MAX_PARALLEL_UPLOADS in flight
  useEffect(() => {
    const active = uploads.filter((u) => u.stage === "uploading" || u.stage === "distributing");
    const slots = MAX_PARALLEL_UPLOADS - active.length;
    if (slots <= 0) return;
    uploads
      .filter((u) => u.stage === "queued" && !handles.current.has(u.id))
      .slice(0, slots)
      .forEach(startUpload);
  }, [uploads, startUpload]);

  /* ── Downloads ────────────────────────────────────────── */

  const download = useCallback(async (file: DfsFile) => {
    setDownloading((d) => ({ ...d, [file.id]: 0 }));
    try {
      await api.downloadFile(file.id, file.name, (p) =>
        setDownloading((d) => ({ ...d, [file.id]: p })),
      );
      setDownloads((prev) => {
        const next = [
          {
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.type,
            at: new Date().toISOString(),
          },
          ...prev.filter((r) => r.id !== file.id),
        ].slice(0, 50);
        writeJson(DOWNLOADS_KEY, next);
        return next;
      });
    } finally {
      setDownloading(({ [file.id]: _, ...rest }) => rest);
    }
  }, []);

  const value: DfsContextValue = useMemo(
    () => ({
      user,
      authReady,
      authConfig,
      authConfigError,
      signIn: async (email, password) => persist(await api.signIn(email, password)),
      signUp: async (name, email, password) => persist(await api.signUp(name, email, password)),
      signOut: async () => {
        await api.signOut();
        resetData();
        persist(null);
      },
      googleSignIn: async (credential) => persist(await api.googleLogin(credential)),
      otpRequest: async (email) => {
        await api.requestOtp(email);
      },
      otpVerify: async (email, code) => persist(await api.verifyOtp(email, code)),
      forgotPassword: async (email) => {
        await api.forgotPassword(email);
      },
      resetPassword: async (token, password) => persist(await api.resetPassword(token, password)),

      files,
      folders,
      filesLoading,
      refreshFiles,
      contentVersion,

      removeFile: async (id) => {
        await api.deleteFile(id);
        setFiles((prev) => prev.filter((f) => f.id !== id));
        scheduleRefresh();
      },
      createFolder: async (name, parentId) => {
        const folder = await api.createFolder(name, parentId);
        scheduleRefresh();
        return folder;
      },
      renameFolder: async (id, name) => {
        await api.renameFolder(id, name);
        scheduleRefresh();
      },
      removeFolder: async (id) => {
        const result = await api.deleteFolder(id);
        scheduleRefresh();
        return result;
      },

      storage,
      nodes,

      uploads,
      enqueue: (items, folderId) =>
        setUploads((prev) => [
          ...prev,
          ...items.map(({ file, relativePath }) => ({
            id: `u_${Math.random().toString(36).slice(2, 10)}`,
            name: file.name,
            size: file.size,
            type: extensionOf(file.name),
            progress: 0,
            stage: "queued" as const,
            folderId,
            ...(relativePath ? { relativePath } : {}),
            file,
          })),
        ]),
      cancelUpload: (id) => {
        const handle = handles.current.get(id);
        if (handle) handle.abort();
        else patchUpload(id, { stage: "cancelled" });
      },
      retryUpload: (id) => patchUpload(id, { stage: "queued", progress: 0, error: undefined }),
      clearFinishedUploads: () =>
        setUploads((prev) =>
          prev.filter(
            (u) => u.stage === "queued" || u.stage === "uploading" || u.stage === "distributing",
          ),
        ),

      downloads,
      downloading,
      download,
    }),
    [
      user,
      authReady,
      authConfig,
      authConfigError,
      persist,
      resetData,
      files,
      folders,
      filesLoading,
      refreshFiles,
      contentVersion,
      scheduleRefresh,
      storage,
      nodes,
      uploads,
      patchUpload,
      downloads,
      downloading,
      download,
    ],
  );

  return <DfsContext.Provider value={value}>{children}</DfsContext.Provider>;
}

export function useDfs() {
  const ctx = useContext(DfsContext);
  if (!ctx) throw new Error("useDfs must be used inside <DfsProvider>");
  return ctx;
}
