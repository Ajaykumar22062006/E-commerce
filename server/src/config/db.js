import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const isCloudDb = Boolean(process.env.DATABASE_URL || process.env.DB_SSL === 'true' || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'));

const poolConfig = process.env.DATABASE_URL
  ? {
      uri: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
      queueLimit: 0,
      decimalNumbers: true
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'buildmart',
      ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
      queueLimit: 0,
      decimalNumbers: true,
      charset: 'utf8mb4'
    };

const pool = mysql.createPool(poolConfig);

export default pool;
