import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Ensure schema_migrations table exists to track applied versions
 */
async function ensureMigrationTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(191) NOT NULL UNIQUE,
      batch INT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_migration_name (migration_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/**
 * Retrieve status of all available migrations
 */
export async function getMigrationStatus() {
  const conn = await pool.getConnection();
  try {
    await ensureMigrationTable(conn);
    const [appliedRows] = await conn.query('SELECT migration_name, batch, applied_at FROM schema_migrations ORDER BY id ASC');
    const appliedMap = new Map(appliedRows.map(r => [r.migration_name, r]));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.map(file => {
      const isApplied = appliedMap.has(file);
      const record = appliedMap.get(file);
      return {
        migration: file,
        applied: isApplied,
        batch: record ? record.batch : null,
        applied_at: record ? record.applied_at : null
      };
    });
  } finally {
    conn.release();
  }
}

/**
 * Execute pending migrations idempotently in order
 */
export async function runMigrations({ silent = false } = {}) {
  const conn = await pool.getConnection();
  try {
    await ensureMigrationTable(conn);

    const [appliedRows] = await conn.query('SELECT migration_name FROM schema_migrations');
    const appliedSet = new Set(appliedRows.map(r => r.migration_name));

    const [batchRow] = await conn.query('SELECT COALESCE(MAX(batch), 0) + 1 AS next_batch FROM schema_migrations');
    const nextBatch = batchRow[0]?.next_batch || 1;

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const pending = files.filter(f => !appliedSet.has(f));

    if (pending.length === 0) {
      if (!silent) {
        console.log('✅ Database schema is up to date. (0 pending migrations)');
      }
      return { appliedCount: 0, totalFiles: files.length };
    }

    if (!silent) {
      console.log(`🔄 Found ${pending.length} pending migration(s) out of ${files.length} total.`);
    }

    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      // Strip comments cleanly
      const cleanSql = sqlContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/--.*$/gm, '');

      const statements = cleanSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await conn.beginTransaction();
      try {
        for (const statement of statements) {
          await conn.query(statement);
        }
        await conn.query(
          'INSERT INTO schema_migrations (migration_name, batch) VALUES (?, ?)',
          [file, nextBatch]
        );
        await conn.commit();
        if (!silent) {
          console.log(`  ✔ Applied [Batch ${nextBatch}]: ${file}`);
        }
      } catch (err) {
        await conn.rollback();
        console.error(`❌ Migration failed at ${file}:`, err.message);
        throw err;
      }
    }

    if (!silent) {
      console.log(`✨ Successfully applied ${pending.length} migration(s).`);
    }

    return { appliedCount: pending.length, totalFiles: files.length };
  } finally {
    conn.release();
  }
}

// Standalone CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isStatus = process.argv.includes('--status');

  if (isStatus) {
    getMigrationStatus()
      .then(status => {
        console.log('\n📋 BuildMart Database Migration Status:');
        console.table(status.map(s => ({
          Migration: s.migration,
          Status: s.applied ? 'APPLIED' : 'PENDING',
          Batch: s.batch ?? '-',
          'Applied At': s.applied_at ? new Date(s.applied_at).toLocaleString() : '-'
        })));
        process.exit(0);
      })
      .catch(err => {
        console.error('Error fetching migration status:', err.message);
        process.exit(1);
      });
  } else {
    runMigrations()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}
