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

const isProd = (import.meta as any).env?.PROD;
// Force the use of the local proxy (/api) in production to bypass CORS issues,
// otherwise use VITE_API_URL for local development if specified.
const API_BASE = isProd ? "/api" : ((import.meta as any).env?.VITE_API_URL || "/api");

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
  const data = await handleResponse<{
    data: { user: { id: number; username: string; email: string }; token: string };
  }>(res);
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
  const data = await handleResponse<{
    data: { user: { id: number; username: string; email: string }; token: string };
  }>(res);
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

/* ── Google OAuth ─────────────────────────────────────────── */

export async function googleLogin(credential: string): Promise<DfsUser> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  const data = await handleResponse<{
    data: {
      user: { id: number; username: string; email: string; authProvider?: string; avatarUrl?: string };
      token: string;
    };
  }>(res);
  setToken(data.data.token);
  return {
    id: String(data.data.user.id),
    name: data.data.user.username,
    email: data.data.user.email,
    avatarUrl: data.data.user.avatarUrl,
    authProvider: (data.data.user.authProvider as "local" | "google") || "google",
  };
}

/* ── OTP Login ────────────────────────────────────────────── */

export async function requestOtp(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  await handleResponse(res);
}

export async function verifyOtp(email: string, code: string): Promise<DfsUser> {
  const res = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const data = await handleResponse<{
    data: {
      user: { id: number; username: string; email: string; authProvider?: string; avatarUrl?: string };
      token: string;
    };
  }>(res);
  setToken(data.data.token);
  return {
    id: String(data.data.user.id),
    name: data.data.user.username,
    email: data.data.user.email,
    avatarUrl: data.data.user.avatarUrl,
    authProvider: (data.data.user.authProvider as "local" | "google") || "local",
  };
}

/* ── Forgot / Reset Password ─────────────────────────────── */

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  await handleResponse(res);
}

export async function resetPassword(token: string, password: string): Promise<DfsUser> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const data = await handleResponse<{
    data: {
      user: { id: number; username: string; email: string; authProvider?: string; avatarUrl?: string };
      token: string;
    };
  }>(res);
  setToken(data.data.token);
  return {
    id: String(data.data.user.id),
    name: data.data.user.username,
    email: data.data.user.email,
    avatarUrl: data.data.user.avatarUrl,
    authProvider: (data.data.user.authProvider as "local" | "google") || "local",
  };
}

/* ── Files ────────────────────────────────────────────────── */

// Wire to GET /api/files
export async function listFiles(): Promise<DfsFile[]> {
  const res = await fetch(`${API_BASE}/files`, { headers: authHeaders() });
  const data = await handleResponse<{ data: { files: DfsFile[] } }>(res);
  return data.data.files;
}

// Wire to DELETE /api/files/:id
export async function deleteFile(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/files/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse(res);
}

// TODO(Phase 3): Wire to POST /api/files/:id/share
export async function createShareLink(id: string): Promise<string> {
  return `https://dfs.io/s/${id}`;
}

/**
 * Upload file to backend.
 * The backend handles chunking and distribution natively. We simulate the stages
 * here for UI feedback since standard fetch doesn't give us granular progress on upload.
 */
export async function uploadFile(
  file: File | { name: string; size: number },
  onProgress: (progress: number, stage: "encrypting" | "chunking" | "distributing") => void,
  signal?: { cancelled: boolean },
): Promise<DfsFile> {
  if (!(file instanceof File)) {
    throw new Error("Cannot upload without a valid File object");
  }

  // Simulate early stages
  if (signal?.cancelled) throw new Error("cancelled");
  onProgress(10, "encrypting");
  await new Promise((r) => setTimeout(r, 100));

  if (signal?.cancelled) throw new Error("cancelled");
  onProgress(30, "chunking");

  const formData = new FormData();
  formData.append("file", file);

  const headers = authHeaders();
  delete headers["Content-Type"]; // Let browser set multipart boundary

  const res = await fetch(`${API_BASE}/files/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  onProgress(70, "distributing");
  const data = await handleResponse<{ data: { file: DfsFile } }>(res);

  onProgress(100, "distributing");
  return data.data.file;
}

/**
 * Download file from backend.
 * Reassembles chunks from nodes, decrypts, and streams to browser.
 */
export async function downloadFile(
  id: string,
  onStage: (stage: "reassembling" | "decrypting" | "ready", progress: number) => void,
): Promise<void> {
  onStage("reassembling", 20);

  const res = await fetch(`${API_BASE}/files/${id}/download`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }

  onStage("decrypting", 70);

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  // Extract filename from Content-Disposition header if possible
  const disposition = res.headers.get("Content-Disposition");
  let filename = "downloaded_file";
  if (disposition && disposition.indexOf("filename=") !== -1) {
    filename = disposition.split("filename=")[1].replace(/["']/g, "");
  }

  onStage("ready", 100);

  // Trigger download in browser
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/* ── Storage ──────────────────────────────────────────────── */

// Wire to GET /api/storage
export async function getStorage(): Promise<StorageUsage> {
  const res = await fetch(`${API_BASE}/storage`, { headers: authHeaders() });
  const data = await handleResponse<{ data: StorageUsage }>(res);
  return data.data;
}
