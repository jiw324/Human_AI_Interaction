/**
 * MySQL connection pool and query helpers shared across the backend.
 *
 * Exposes `query` / `queryOne` for parameterized statements, `transaction`
 * for multi-statement atomic operations, and `testConnection` used at
 * startup to verify the database is reachable. All controllers/services
 * should go through these helpers rather than touching `pool` directly.
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

// Database configuration from environment variables
const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'human_ai_interaction',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🏠 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`👤 User: ${dbConfig.user}`);
    console.log(`🔐 Password: ${dbConfig.password ? 'SET' : 'NOT SET'}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error(`🔍 Attempted connection with user: ${dbConfig.user}`);
    console.error(`🔍 Password set: ${dbConfig.password ? 'YES' : 'NO'}`);
    return false;
  }
};

// Execute query with connection from pool
export const query = async <T = any>(
  sql: string,
  params?: any[]
): Promise<T> => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Execute query and return first row
export const queryOne = async <T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> => {
  try {
    const [rows] = await pool.execute(sql, params);
    const result = rows as T[];
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Execute transaction
export const transaction = async <T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Caller runs its own queries against `connection` so they share the
    // same transaction context; commit/rollback happens here based on outcome.
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('❌ Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Get connection from pool (for custom operations)
export const getConnection = async (): Promise<mysql.PoolConnection> => {
  return await pool.getConnection();
};

// Close all connections in pool
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('🔌 Database connection pool closed');
};

// Export pool for direct access if needed
export { pool };

// Export default connection
export default {
  query,
  queryOne,
  transaction,
  getConnection,
  testConnection,
  closePool,
  pool,
};

