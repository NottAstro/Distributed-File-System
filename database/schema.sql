-- =============================================
-- Distributed File System — Database Schema
-- Version: 1.0
-- =============================================

CREATE DATABASE IF NOT EXISTS distributed_fs
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE distributed_fs;

-- -----------------------------------------
-- Table: users
-- Purpose: Stores registered user accounts
-- Used by: Authentication system
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------
-- Table: files
-- Purpose: Metadata for every uploaded file
-- One row = one file (regardless of how many chunks)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS files (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    original_name   VARCHAR(255) NOT NULL,
    file_size       BIGINT       NOT NULL,
    mime_type       VARCHAR(100),
    total_chunks    INT          NOT NULL DEFAULT 1,
    status          ENUM('uploading','complete','failed') DEFAULT 'uploading',
    uploaded_by     INT          NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_files_uploaded_by (uploaded_by),
    INDEX idx_files_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------
-- Table: storage_nodes
-- Purpose: Tracks available storage locations
-- Dev = folders (node1/, node2/, node3/)
-- Prod = separate servers
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS storage_nodes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    node_name       VARCHAR(50)  NOT NULL UNIQUE,
    storage_path    VARCHAR(500) NOT NULL,
    total_space     BIGINT       DEFAULT 0,
    used_space      BIGINT       DEFAULT 0,
    status          ENUM('online','offline','maintenance') DEFAULT 'online',
    last_heartbeat  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_nodes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------
-- Table: chunks
-- Purpose: Tracks individual pieces of split files
-- A 10MB file split into 4 chunks = 4 rows here
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS chunks (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    file_id         INT          NOT NULL,
    chunk_index     INT          NOT NULL,
    chunk_size      INT          NOT NULL,
    checksum        VARCHAR(64),
    node_id         INT          NOT NULL,
    storage_path    VARCHAR(500) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES storage_nodes(id),
    UNIQUE KEY unique_chunk (file_id, chunk_index),
    INDEX idx_chunks_file_id (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------
-- Table: replicas
-- Purpose: Copies of chunks for redundancy
-- If node1 goes down, the replica on node2 saves the day
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS replicas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    chunk_id        INT          NOT NULL,
    node_id         INT          NOT NULL,
    storage_path    VARCHAR(500) NOT NULL,
    is_primary      BOOLEAN      DEFAULT FALSE,
    status          ENUM('synced','syncing','failed') DEFAULT 'synced',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES storage_nodes(id),
    UNIQUE KEY unique_replica (chunk_id, node_id),
    INDEX idx_replicas_chunk_id (chunk_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
