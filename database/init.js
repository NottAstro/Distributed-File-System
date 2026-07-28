/**
 * Database Initializer
 * 
 * Run with: npm run db:init
 * 
 * This script:
 * 1. Connects to MySQL (without specifying a database — it might not exist yet)
 * 2. Runs schema.sql (creates database + all 5 tables)
 * 3. Runs seed.sql (inserts the 3 storage nodes)
 * 4. Lists all created tables as verification
 * 
 * Safe to run multiple times (uses IF NOT EXISTS and INSERT IGNORE).
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('../server/config/index');

async function initializeDatabase() {
    let connection;

    try {
        // Connect WITHOUT specifying a database (it may not exist yet)
        console.log('🔌 Connecting to MySQL server...');
        connection = await mysql.createConnection({
            host:     config.db.host,
            port:     config.db.port,
            user:     config.db.user,
            password: config.db.password,
            multipleStatements: true,   // Allows running multiple SQL statements at once
        });
        console.log('✅ Connected to MySQL server');

        // Run schema.sql
        console.log('📦 Creating database and tables...');
        const schemaSQL = fs.readFileSync(
            path.join(__dirname, 'schema.sql'), 'utf8'
        );
        await connection.query(schemaSQL);
        console.log('✅ Database and tables created');

        // Run seed.sql
        console.log('🌱 Inserting seed data...');
        const seedSQL = fs.readFileSync(
            path.join(__dirname, 'seed.sql'), 'utf8'
        );
        await connection.query(seedSQL);
        console.log('✅ Seed data inserted');

        // Verify — list all tables
        const [tables] = await connection.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
            [config.db.database]
        );
        console.log('\n📋 Tables created:');
        tables.forEach((row) => console.log(`   • ${row.TABLE_NAME}`));
        console.log('\n🎉 Database initialization complete!');

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

initializeDatabase();
