const mysql = require('mysql2/promise');
const config = require('./index');

/**
 * MySQL Connection Pool
 * 
 * WHY A POOL?
 * A single connection handles one query at a time. If two users
 * hit the API simultaneously, one waits. A pool keeps multiple
 * connections ready — requests grab one, use it, and return it.
 * 
 * SECURITY:
 * - Password comes from process.env (via config), never hardcoded
 * - Uses parameterized queries (pool.execute) to prevent SQL injection
 */
const pool = mysql.createPool({
  host:               config.db.host,
  port:               config.db.port,
  user:               config.db.user,
  password:           config.db.password,
  database:           config.db.database,
  waitForConnections: true,    // Queue requests when all connections are busy
  connectionLimit:    10,      // Max 10 simultaneous connections
  queueLimit:         0,       // Unlimited queue size (0 = no limit)
  enableKeepAlive:    true,    // Prevent idle timeout disconnects
  keepAliveInitialDelay: 0,    // Start keepalive immediately
});

module.exports = pool;
