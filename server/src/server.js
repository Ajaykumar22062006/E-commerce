import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import { execSync, spawn } from 'child_process';
import app from './app.js';
import pool from './config/db.js';
import logger from './utils/logger.js';

const PORT = parseInt(process.env.PORT, 10) || 5000;
const IS_DEV = (process.env.NODE_ENV || 'development') !== 'production';

// In development, automatically free the port if held by a zombie/stale process
function ensurePortFree(port) {
  if (!IS_DEV) return;
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1], 10);
          if (pid && pid !== process.pid) {
            logger.info(`Port ${port} is occupied by PID ${pid}. Freeing port...`);
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            } catch {
              // ignore if already exited
            }
          }
        }
      }
    } else {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    }
  } catch {
    // Port is already free or command not found
  }
}

// Auto-start MySQL if it is not running (Windows local development helper)
function tryStartLocalMySql() {
  if (!IS_DEV || process.platform !== 'win32') return false;
  const mysqldPath = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe';
  const myIniPath = 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\my.ini';

  if (fs.existsSync(mysqldPath) && fs.existsSync(myIniPath)) {
    try {
      logger.info('MySQL is not running. Attempting to start local mysqld service...');
      const child = spawn(mysqldPath, [`--defaults-file=${myIniPath}`], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      return true;
    } catch (e) {
      logger.warn(`Could not auto-start mysqld: ${e.message}`);
    }
  }
  return false;
}

// Retry database connection with backoff rather than crashing immediately
async function verifyDatabaseWithRetry(maxRetries = 5, delayMs = 1500) {
  let attemptedAutoStart = false;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await pool.getConnection();
      logger.info('Database connection verified successfully.');
      connection.release();
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' && !attemptedAutoStart) {
        attemptedAutoStart = true;
        tryStartLocalMySql();
      }

      if (attempt === maxRetries) {
        throw error;
      }
      logger.warn(`Database not ready (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

let serverInstance = null;

async function startServer() {
  try {
    // Ensure port is free from any previous aborted session
    ensurePortFree(PORT);

    // Verify database connection with resilient retries
    await verifyDatabaseWithRetry();

    serverInstance = app.listen(PORT, () => {
      logger.info(`🚀 BuildMart Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`Port ${PORT} is busy (EADDRINUSE). Freeing port and retrying...`);
        ensurePortFree(PORT);
        setTimeout(() => {
          if (serverInstance) {
            try { serverInstance.close(); } catch {}
          }
          startServer();
        }, 1000);
      } else {
        logger.error(`Server error: ${err.message}`, { error: err });
      }
    });

    // Graceful shutdown
    const handleShutdown = async (signal) => {
      logger.info(`Received ${signal}. Gracefully closing BuildMart server...`);
      if (serverInstance) {
        serverInstance.close(async () => {
          logger.info('HTTP server closed.');
          try {
            await pool.end();
            logger.info('MySQL connection pool closed.');
            process.exit(0);
          } catch (err) {
            logger.error('Error closing database pool:', { error: err.message });
            process.exit(1);
          }
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    const errorMsg = error.message || error.code || 'Unknown server initialization error';
    logger.error(`Failed to start BuildMart server: ${errorMsg}`, {
      code: error.code,
      details: error.code === 'ECONNREFUSED'
        ? `Could not connect to MySQL at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}. Make sure MySQL is running.`
        : (error.message || String(error))
    });

    if (IS_DEV) {
      logger.info('In development mode: Retrying server startup in 5s instead of terminating...');
      setTimeout(() => startServer(), 5000);
    } else {
      process.exit(1);
    }
  }
}

startServer();
