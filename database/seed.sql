-- =============================================
-- Seed Data for Development
-- =============================================
USE distributed_fs;

-- Register the 3 local storage nodes
-- These match the server/storage/node1, node2, node3 folders
INSERT IGNORE INTO storage_nodes (node_name, storage_path, total_space, status)
VALUES
    ('node1', 'server/storage/node1', 1073741824, 'online'),   -- 1 GB
    ('node2', 'server/storage/node2', 1073741824, 'online'),   -- 1 GB
    ('node3', 'server/storage/node3', 1073741824, 'online');   -- 1 GB
