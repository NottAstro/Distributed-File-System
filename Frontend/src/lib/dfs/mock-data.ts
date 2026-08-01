import type { DfsFile, DfsUser, StorageUsage } from "./types";

/**
 * Mock data source. Replace the contents of api.ts with real backend calls;
 * these fixtures exist only so the UI has something to render.
 */

export const MOCK_USER: DfsUser = {
  id: "usr_01",
  name: "Ada Kovacs",
  email: "ada@dfs.io",
};

export const MOCK_STORAGE: StorageUsage = {
  usedBytes: 2.4 * 1024 ** 3,
  quotaBytes: 10 * 1024 ** 3,
};

export const MOCK_FILES: DfsFile[] = [
  {
    id: "f_01",
    name: "q3-architecture-review.pdf",
    size: 12.4 * 1024 ** 2,
    type: "pdf",
    uploadedAt: "2026-07-28T14:32:00Z",
    status: "distributed",
    chunks: 4,
    nodes: 3,
    encryption: "AES-256-CBC",
  },
  {
    id: "f_02",
    name: "node-topology.png",
    size: 3.1 * 1024 ** 2,
    type: "png",
    uploadedAt: "2026-07-27T09:04:00Z",
    status: "distributed",
    chunks: 2,
    nodes: 2,
    encryption: "AES-256-CBC",
  },
  {
    id: "f_03",
    name: "cluster-backup-2026-07.zip",
    size: 842 * 1024 ** 2,
    type: "zip",
    uploadedAt: "2026-07-26T22:11:00Z",
    status: "processing",
    chunks: 96,
    nodes: 6,
    encryption: "AES-256-CBC",
  },
  {
    id: "f_04",
    name: "replication-metrics.csv",
    size: 480 * 1024,
    type: "csv",
    uploadedAt: "2026-07-24T11:47:00Z",
    status: "distributed",
    chunks: 1,
    nodes: 2,
    encryption: "AES-256-CBC",
  },
  {
    id: "f_05",
    name: "keynote-recording.mp4",
    size: 1.7 * 1024 ** 3,
    type: "mp4",
    uploadedAt: "2026-07-20T17:20:00Z",
    status: "failed",
    chunks: 0,
    nodes: 0,
    encryption: "AES-256-CBC",
  },
  {
    id: "f_06",
    name: "consensus-notes.md",
    size: 24 * 1024,
    type: "md",
    uploadedAt: "2026-07-18T08:02:00Z",
    status: "distributed",
    chunks: 1,
    nodes: 3,
    encryption: "AES-256-CBC",
  },
];

export const MOCK_SESSIONS = [
  { id: "s1", device: "MacBook Pro · Chrome", location: "Berlin, DE", lastActive: "Active now" },
  { id: "s2", device: "iPhone 16 · Safari", location: "Berlin, DE", lastActive: "2 hours ago" },
  { id: "s3", device: "Linux · Firefox", location: "Amsterdam, NL", lastActive: "3 days ago" },
];
