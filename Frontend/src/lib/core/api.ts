import type {
  DfsFile,
  DfsFolder,
  DfsUser,
  FileDetail,
  FolderContents,
  StorageNode,
  StorageUsage,
} from "./types";

/**
 * ─────────────────────────────────────────────────────────────
 * DFS API layer (LIVE — connected to Express backend)
 * ─────────────────────────────────────────────────────────────
 * Every function here is the single seam between UI and backend.
 * The UI imports nothing else from the network layer.
 *
 * Backend: http://localhost:3000/api
 * Auth tokens are stored in localStorage and sent via
 * Authorization: Bearer <token> header.
 */

const isProd = (import.meta as any).env?.PROD;
// Force the use of the local proxy (/api) in production to bypass CORS issues,
// otherwise use VITE_API_URL for local development if specified.
const API_BASE = isProd ? "/api" : (import.meta as any).env?.VITE_API_URL || "/api";

const SESSION_TOKEN_KEY = "dfs.token";

/** Get the stored JWT token */
function getToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Store the JWT token */
function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
    else localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Build headers with auth token */
function authHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = json ? { "Content-Type": "application/json" } : {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** Fired when an authenticated call gets 401 — the store signs the user out. */
export const UNAUTHORIZED_EVENT = "dfs:unauthorized";

function notifyUnauthorized(status: number, hadToken: boolean) {
  if (status === 401 && hadToken && typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

/** Friendly message for statuses that usually come back as HTML from a proxy. */
function statusMessage(status: number): string {
  if (status === 413) return "File is too large for the server.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status === 502 || status === 503 || status === 504)
    return "The server is unavailable. Try again shortly.";
  return `Request failed (${status})`;
}

/**
 * Shared response handler — throws on error.
 * Tolerates non-JSON bodies (proxy error pages), which used to surface as
 * "Unexpected token '<'" instead of a useful message.
 */
type ApiEnvelope = { success?: boolean; error?: { message?: string } } | null;

async function handleResponse<T>(res: Response, hadToken = false): Promise<T> {
  let data: ApiEnvelope = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok || !data?.success) {
    notifyUnauthorized(res.status, hadToken);
    throw new Error(data?.error?.message || statusMessage(res.status));
  }
  return data as T;
}

/** Authenticated JSON request. */
async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
  return handleResponse<T>(res, true);
}

type AuthPayload = {
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      authProvider?: string;
      avatarUrl?: string;
    };
    token: string;
  };
};

/** Store the token and map the server user to the client shape. */
function acceptAuth(data: AuthPayload, defaultProvider?: "local" | "google"): DfsUser {
  setToken(data.data.token);
  const u = data.data.user;
  const provider = (u.authProvider as "local" | "google" | undefined) || defaultProvider;
  return {
    id: String(u.id),
    name: u.username,
    email: u.email,
    ...(u.avatarUrl ? { avatarUrl: u.avatarUrl } : {}),
    ...(provider ? { authProvider: provider } : {}),
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

/* ── Auth ─────────────────────────────────────────────────── */

export async function signIn(email: string, password: string): Promise<DfsUser> {
  return acceptAuth(await postJson<AuthPayload>("/auth/login", { email, password }));
}

export async function signUp(name: string, email: string, password: string): Promise<DfsUser> {
  return acceptAuth(
    await postJson<AuthPayload>("/auth/register", { username: name, email, password }),
  );
}

export async function signOut(): Promise<void> {
  setToken(null);
}

/* ── Google OAuth ─────────────────────────────────────────── */

export async function googleLogin(credential: string): Promise<DfsUser> {
  return acceptAuth(await postJson<AuthPayload>("/auth/google", { credential }), "google");
}

/* ── OTP Login ────────────────────────────────────────────── */

export async function requestOtp(email: string): Promise<void> {
  await postJson("/auth/otp/request", { email });
}

export async function verifyOtp(email: string, code: string): Promise<DfsUser> {
  return acceptAuth(await postJson<AuthPayload>("/auth/otp/verify", { email, code }), "local");
}

/* ── Forgot / Reset Password ─────────────────────────────── */

export async function forgotPassword(email: string): Promise<void> {
  await postJson("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, password: string): Promise<DfsUser> {
  return acceptAuth(
    await postJson<AuthPayload>("/auth/reset-password", { token, password }),
    "local",
  );
}

/* ── Files ────────────────────────────────────────────────── */

/** Every file the user owns, across all folders. */
export async function listFiles(): Promise<DfsFile[]> {
  const data = await authed<{ data: { files: DfsFile[] } }>("/files");
  return data.data.files;
}

export async function getFileDetail(id: string): Promise<FileDetail> {
  const data = await authed<{ data: FileDetail }>(`/files/${encodeURIComponent(id)}`);
  return data.data;
}

export async function deleteFile(id: string): Promise<void> {
  await authed(`/files/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* ── Folders ──────────────────────────────────────────────── */

export async function listFolders(): Promise<DfsFolder[]> {
  const data = await authed<{ data: { folders: DfsFolder[] } }>("/folders");
  return data.data.folders;
}

/** Subfolders, files and breadcrumb path of one folder (null = root). */
export async function getFolderContents(folderId: string | null): Promise<FolderContents> {
  const data = await authed<{ data: FolderContents }>(
    `/folders/${folderId ? encodeURIComponent(folderId) : "root"}/contents`,
  );
  return data.data;
}

export async function createFolder(name: string, parentId: string | null): Promise<DfsFolder> {
  const data = await authed<{ data: { folder: DfsFolder } }>("/folders", {
    method: "POST",
    body: JSON.stringify({ name, parentId }),
  });
  return data.data.folder;
}

export async function renameFolder(id: string, name: string): Promise<DfsFolder> {
  const data = await authed<{ data: { folder: DfsFolder } }>(`/folders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return data.data.folder;
}

export async function deleteFolder(id: string): Promise<{ folders: number; files: number }> {
  const data = await authed<{ data: { folders: number; files: number } }>(
    `/folders/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return data.data;
}

/* ── Upload ───────────────────────────────────────────────── */

export interface UploadHandle {
  promise: Promise<DfsFile>;
  abort: () => void;
}

/**
 * Upload one file with REAL progress (XMLHttpRequest exposes upload
 * progress; fetch does not). `onProgress` gets 0–100 while bytes are sent,
 * then `distributing` while the server chunks the file onto nodes.
 */
export function uploadFile(
  file: File,
  opts: { folderId: string | null; relativePath?: string | undefined },
  onProgress: (progress: number, stage: "uploading" | "distributing") => void,
): UploadHandle {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<DfsFile>((resolve, reject) => {
    const form = new FormData();
    if (opts.folderId) form.append("folderId", opts.folderId);
    if (opts.relativePath) form.append("relativePath", opts.relativePath);
    form.append("file", file);

    xhr.open("POST", `${API_BASE}/files/upload`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100), "uploading");
    };
    xhr.upload.onload = () => onProgress(100, "distributing");

    xhr.onload = () => {
      let data: (ApiEnvelope & { data?: { file: DfsFile } }) | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.success) {
        resolve(data.data!.file);
      } else {
        notifyUnauthorized(xhr.status, Boolean(token));
        reject(new Error(data?.error?.message || statusMessage(xhr.status)));
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));

    xhr.send(form);
  });

  return { promise, abort: () => xhr.abort() };
}

/* ── Download ─────────────────────────────────────────────── */

/** Pull the filename out of Content-Disposition, preferring RFC 5987 filename*. */
function filenameFrom(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1] || fallback;
}

/**
 * Download a file. The server reassembles the chunks (rebuilding a missing
 * one from parity if needed) and sends the result back.
 */
export async function downloadFile(
  id: string,
  fallbackName = "download",
  onProgress?: (progress: number) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/files/${encodeURIComponent(id)}/download`, {
    headers: authHeaders(false),
  });
  if (!res.ok) {
    await handleResponse(res, true); // throws with the server's message
  }

  // Read the body incrementally so we can report progress
  const total = Number(res.headers.get("Content-Length")) || 0;
  let blob: Blob;
  if (res.body && total && onProgress) {
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      received += value.length;
      onProgress(Math.round((received / total) * 100));
    }
    blob = new Blob(parts as BlobPart[]);
  } else {
    blob = await res.blob();
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filenameFrom(res.headers.get("Content-Disposition"), fallbackName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking synchronously can cancel the download in some browsers
  setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
}

/* ── Storage ──────────────────────────────────────────────── */

export async function getStorage(): Promise<StorageUsage> {
  const data = await authed<{ data: StorageUsage }>("/storage");
  return data.data;
}

export async function getNodes(): Promise<StorageNode[]> {
  const data = await authed<{ data: { nodes: StorageNode[] } }>("/nodes");
  return data.data.nodes;
}
