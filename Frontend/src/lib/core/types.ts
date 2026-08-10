export type FileStatus = "distributed" | "processing" | "failed";

export interface DfsFile {
  id: string;
  name: string;
  /** bytes */
  size: number;
  /** lowercase extension, e.g. "pdf" */
  type: string;
  uploadedAt: string; // ISO
  status: FileStatus;
  chunks: number;
  nodes: number;
  encryption: string;
}

export interface DfsUser {
  id: string;
  name: string;
  email: string;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

export type UploadStage =
  "queued" | "encrypting" | "chunking" | "distributing" | "complete" | "failed";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number; // 0-100
  stage: UploadStage;
  file?: File;
}

export type DownloadStage = "idle" | "reassembling" | "decrypting" | "ready";
