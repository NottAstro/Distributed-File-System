import type { DfsFile, DfsUser, StorageUsage } from "./types";
import { MOCK_FILES, MOCK_STORAGE, MOCK_USER } from "./mock-data";
import { extensionOf } from "./format";

/**
 * ─────────────────────────────────────────────────────────────
 * DFS API layer (MOCK)
 * ─────────────────────────────────────────────────────────────
 * Every function here is the single seam between UI and backend.
 * To go live, replace each body with a real fetch() call to your
 * Express backend and keep the signatures intact.
 * The UI imports nothing else.
 */

const LATENCY = 420;
const wait = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms));

let files: DfsFile[] = [...MOCK_FILES];

/* ── Auth ─────────────────────────────────────────────────── */

// TODO(backend): POST /auth/login → { user, token }
export async function signIn(email: string, _password: string): Promise<DfsUser> {
  await wait();
  return { ...MOCK_USER, email };
}

// TODO(backend): POST /auth/register → { user, token }
export async function signUp(name: string, email: string, _password: string): Promise<DfsUser> {
  await wait();
  return { id: "usr_new", name, email };
}

// TODO(backend): POST /auth/logout
export async function signOut(): Promise<void> {
  await wait(120);
}

/* ── Files ────────────────────────────────────────────────── */

// TODO(backend): GET /files
export async function listFiles(): Promise<DfsFile[]> {
  await wait(200);
  return [...files];
}

// TODO(backend): DELETE /files/:id
export async function deleteFile(id: string): Promise<void> {
  await wait(200);
  files = files.filter((f) => f.id !== id);
}

// TODO(backend): POST /files/:id/share → { url }
export async function createShareLink(id: string): Promise<string> {
  await wait(200);
  return `https://dfs.io/s/${id}`;
}

/**
 * TODO(backend): multipart upload — client-side encrypt, chunk, then
 * PUT each chunk to the coordinator. `onProgress` mirrors the real
 * stage machine so the UI needs no changes.
 */
export async function uploadFile(
  file: { name: string; size: number },
  onProgress: (progress: number, stage: "encrypting" | "chunking" | "distributing") => void,
  signal?: { cancelled: boolean },
): Promise<DfsFile> {
  const stages = ["encrypting", "chunking", "distributing"] as const;
  for (let step = 0; step <= 100; step += 4) {
    if (signal?.cancelled) throw new Error("cancelled");
    const stage = stages[Math.min(Math.floor(step / 34), 2)]!;
    onProgress(step, stage);
    await wait(45);
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
  files = [created, ...files];
  return created;
}

/**
 * TODO(backend): GET /files/:id/download — fetch chunks from nodes,
 * reassemble and decrypt, then stream to the browser.
 */
export async function downloadFile(
  _id: string,
  onStage: (stage: "reassembling" | "decrypting" | "ready", progress: number) => void,
): Promise<void> {
  for (let p = 0; p <= 100; p += 5) {
    onStage(p < 60 ? "reassembling" : p < 100 ? "decrypting" : "ready", p);
    await wait(60);
  }
}

/* ── Storage ──────────────────────────────────────────────── */

// TODO(backend): GET /storage
export async function getStorage(): Promise<StorageUsage> {
  await wait(150);
  const used = files.reduce((sum, f) => sum + f.size, 0);
  return { usedBytes: Math.max(used, MOCK_STORAGE.usedBytes), quotaBytes: MOCK_STORAGE.quotaBytes };
}
