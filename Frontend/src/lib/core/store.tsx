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
import * as api from "./api";
import type { DfsFile, DfsUser, StorageUsage, UploadItem } from "./types";
import { extensionOf } from "./format";

/**
 * Client-side app state. Auth + files are held here so swapping api.ts for a
 * real backend requires no component changes. Session is persisted in
 * localStorage today; replace with real token/session handling later.
 */

const SESSION_KEY = "dfs.session";

interface DfsContextValue {
  user: DfsUser | null;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  googleSignIn: (credential: string) => Promise<void>;
  otpRequest: (email: string) => Promise<void>;
  otpVerify: (email: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;

  files: DfsFile[];
  filesLoading: boolean;
  refreshFiles: () => Promise<void>;
  removeFile: (id: string) => Promise<void>;

  storage: StorageUsage | null;

  uploads: UploadItem[];
  enqueue: (files: File[]) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  startUploads: () => Promise<void>;

  uploadOpen: boolean;
  setUploadOpen: (open: boolean) => void;
}

const DfsContext = createContext<DfsContextValue | null>(null);

export function DfsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DfsUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [files, setFiles] = useState<DfsFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const cancelled = useRef<Record<string, { cancelled: boolean }>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw) as DfsUser);
    } catch {
      /* ignore */
    }
    setAuthReady(true);
  }, []);

  const persist = (next: DfsUser | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  };

  const refreshFiles = useCallback(async () => {
    setFilesLoading(true);
    const [list, usage] = await Promise.all([api.listFiles(), api.getStorage()]);
    setFiles(list);
    setStorage(usage);
    setFilesLoading(false);
  }, []);

  useEffect(() => {
    if (user) void refreshFiles();
  }, [user, refreshFiles]);

  const value: DfsContextValue = useMemo(
    () => ({
      user,
      authReady,
      signIn: async (email, password) => persist(await api.signIn(email, password)),
      signUp: async (name, email, password) => persist(await api.signUp(name, email, password)),
      signOut: async () => {
        await api.signOut();
        persist(null);
        setFiles([]);
      },
      googleSignIn: async (credential) => persist(await api.googleLogin(credential)),
      otpRequest: async (email) => { await api.requestOtp(email); },
      otpVerify: async (email, code) => persist(await api.verifyOtp(email, code)),
      forgotPassword: async (email) => { await api.forgotPassword(email); },
      resetPassword: async (token, password) => persist(await api.resetPassword(token, password)),
      files,
      filesLoading,
      refreshFiles,
      removeFile: async (id) => {
        await api.deleteFile(id);
        setFiles((prev) => prev.filter((f) => f.id !== id));
      },
      storage,
      uploads,
      enqueue: (incoming) =>
        setUploads((prev) => [
          ...prev,
          ...incoming.map((f) => ({
            id: `u_${Math.random().toString(36).slice(2, 9)}`,
            name: f.name,
            size: f.size,
            type: extensionOf(f.name),
            progress: 0,
            stage: "queued" as const,
            file: f,
          })),
        ]),
      removeFromQueue: (id) => {
        const flag = cancelled.current[id];
        if (flag) flag.cancelled = true;
        setUploads((prev) => prev.filter((u) => u.id !== id));
      },
      clearQueue: () => {
        Object.values(cancelled.current).forEach((f) => (f.cancelled = true));
        setUploads([]);
      },
      startUploads: async () => {
        const pending = uploads.filter((u) => u.stage === "queued");
        for (const item of pending) {
          const signal = { cancelled: false };
          cancelled.current[item.id] = signal;
          try {
            const created = await api.uploadFile(
              item.file || { name: item.name, size: item.size },
              (progress, stage) =>
                setUploads((prev) =>
                  prev.map((u) => (u.id === item.id ? { ...u, progress, stage } : u)),
                ),
              signal,
            );
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id ? { ...u, progress: 100, stage: "complete" as const } : u,
              ),
            );
            setFiles((prev) => [created, ...prev]);
          } catch {
            setUploads((prev) =>
              prev.map((u) => (u.id === item.id ? { ...u, stage: "failed" as const } : u)),
            );
          }
        }
        setStorage(await api.getStorage());
      },
      uploadOpen,
      setUploadOpen,
    }),
    [user, authReady, files, filesLoading, storage, uploads, uploadOpen, refreshFiles],
  );

  return <DfsContext.Provider value={value}>{children}</DfsContext.Provider>;
}

export function useDfs() {
  const ctx = useContext(DfsContext);
  if (!ctx) throw new Error("useDfs must be used inside <DfsProvider>");
  return ctx;
}
