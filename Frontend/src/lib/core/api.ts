import type { DfsFile, DfsUser, StorageUsage } from "./types";
import { extensionOf } from "./format";

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

const API_BASE = "/api";

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
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** Shared response handler — throws on error */
async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || `Request failed (${res.status})`);
  }
  return data;
}

/* ── Auth ─────────────────────────────────────────────────── */

export async function signIn(email: string, password: string): Promise<DfsUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<{ data: { user: { id: number; username: string; email: string }; token: string } }>(res);
  setToken(data.data.token);
  return {
    id: String(data.data.user.id),
    name: data.data.user.username,
    email: data.data.user.email,
  };
}

export async function signUp(name: string, email: string, password: string): Promise<DfsUser> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name, email, password }),
  });
  const data = await handleResponse<{ data: { user: { id: number; username: string; email: string }; token: string } }>(res);
  setToken(data.data.token);
  return {
    id: String(data.data.user.id),
    name: data.data.user.username,
    email: data.data.user.email,
  };
}

export async function signOut(): Promise<void> {
  setToken(null);
}

/* ── Files ────────────────────────────────────────────────── */

// TODO(Phase 3): Wire to GET /api/files when file endpoints are built
export async function listFiles(): Promise<DfsFile[]> {
  // File endpoints not yet implemented in backend — return empty for now
  return [];
}

// TODO(Phase 3): Wire to DELETE /api/files/:id
export async function deleteFile(_id: string): Promise<void> {
  // File endpoints not yet implemented in backend
}

// TODO(Phase 3): Wire to POST /api/files/:id/share
export async function createShareLink(id: string): Promise<string> {
  return `https://dfs.io/s/${id}`;
}

/**
 * TODO(Phase 3): multipart upload — client-side encrypt, chunk, then
 * PUT each chunk to the coordinator. `onProgress` mirrors the real
 * stage machine so the UI needs no changes.
 */
export async function uploadFile(
  file: { name: string; size: number },
  onProgress: (progress: number, stage: "encrypting" | "chunking" | "distributing") => void,
  signal?: { cancelled: boolean },
): Promise<DfsFile> {
  // Simulate upload stages until backend file endpoints exist
  const stages = ["encrypting", "chunking", "distributing"] as const;
  for (let step = 0; step <= 100; step += 4) {
    if (signal?.cancelled) throw new Error("cancelled");
    const stage = stages[Math.min(Math.floor(step / 34), 2)]!;
    onProgress(step, stage);
    await new Promise((r) => setTimeout(r, 45));
  }
  const created: DfsFile = {
    id: `f_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    type: extensionOf(file.name),
    uploadedAt: new Date().toISOString(),
    status: "distributed",
    chunks: Math.max(1, Math.ceil(file.size / (8 * 1024 * 1024))),
    nodes: 3,
    encryption: "AES-256-CBC",
  };
  return created;
}

/**
 * TODO(Phase 3): GET /api/files/:id/download — fetch chunks from nodes,
 * reassemble and decrypt, then stream to the browser.
 */
export async function downloadFile(
  _id: string,
  onStage: (stage: "reassembling" | "decrypting" | "ready", progress: number) => void,
): Promise<void> {
  for (let p = 0; p <= 100; p += 5) {
    onStage(p < 60 ? "reassembling" : p < 100 ? "decrypting" : "ready", p);
    await new Promise((r) => setTimeout(r, 60));
  }
}

/* ── Storage ──────────────────────────────────────────────── */

// TODO(Phase 3): Wire to GET /api/storage
export async function getStorage(): Promise<StorageUsage> {
  return { usedBytes: 0, quotaBytes: 10 * 1024 * 1024 * 1024 }; // 10 GB default quota
}
