export type FileStatus = "distributed" | "processing" | "failed";

export interface DfsFile {
  id: string;
  /** null = root */
  folderId: string | null;
  name: string;
  /** bytes */
  size: number;
  /** lowercase extension, e.g. "pdf" */
  type: string;
  mimeType: string;
  uploadedAt: string; // ISO
  status: FileStatus;
  chunks: number;
  nodes: number;
  /** e.g. "2+1 XOR parity" */
  redundancy: string;
}

export interface DfsFolder {
  id: string;
  name: string;
  /** null = root */
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  /** direct children (folders + files); present on folder listings */
  itemCount?: number;
  /** bytes of files directly inside */
  size?: number;
}

export interface Crumb {
  id: string;
  name: string;
}

export interface FolderContents {
  folder: DfsFolder | null;
  path: Crumb[];
  folders: DfsFolder[];
  files: DfsFile[];
}

export interface ChunkInfo {
  index: number;
  role: string;
  size: number;
  node: string;
  nodeStatus: string;
  checksum: string;
  healthy: boolean;
}

export interface FileDetail {
  file: DfsFile;
  chunks: ChunkInfo[];
  path: Crumb[];
}

export interface StorageNode {
  id: string;
  name: string;
  status: "online" | "offline" | "maintenance";
  usedBytes: number;
  totalBytes: number;
  lastHeartbeat: string;
}

export interface DfsUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  authProvider?: "local" | "google";
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

export type UploadStage =
  "queued" | "uploading" | "distributing" | "complete" | "failed" | "cancelled";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  type: string;
  /** 0-100, real bytes sent */
  progress: number;
  stage: UploadStage;
  /** destination folder at the time of enqueue (null = root) */
  folderId: string | null;
  /** path inside a dropped/picked folder, e.g. "Photos/2024/a.jpg" */
  relativePath?: string | undefined;
  error?: string | undefined;
  file: File;
}

export interface DownloadRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  at: string; // ISO
}
