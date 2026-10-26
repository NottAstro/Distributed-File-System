-- =============================================
-- DESTRUCTIVE: drops every table. Local development only.
-- Run: mysql -u root -p distributed_fs < database/reset.sql
-- then: npm run db:init
-- =============================================
DROP TABLE IF EXISTS replicas;
DROP TABLE IF EXISTS chunks;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS storage_nodes;
DROP TABLE IF EXISTS users;
