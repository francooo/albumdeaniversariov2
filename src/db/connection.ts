/**
 * Neon PostgreSQL Database Connection
 * Using @neondatabase/serverless for edge-compatible database access
 */

import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless';

// Enable connection pooling for better performance
neonConfig.fetchConnectionCache = true;

// Database URL from environment variables
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || '';

// Debug logging
console.log('Database URL configured:', DATABASE_URL ? 'Yes (length: ' + DATABASE_URL.length + ')' : 'No');

if (!DATABASE_URL) {
  console.warn('DATABASE_URL not found in environment variables. Database features will be disabled.');
  console.warn('Please ensure VITE_DATABASE_URL is set in your .env file');
}

// Create SQL query executor
export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

console.log('SQL connection object:', sql ? 'Created' : 'NULL');

// Connection test function
export async function testConnection(): Promise<boolean> {
  if (!sql) {
    console.error('Database connection not available - DATABASE_URL not configured');
    return false;
  }

  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('Database connected successfully:', result[0].current_time);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Check if database is available
export function isDatabaseAvailable(): boolean {
  return sql !== null;
}

// Typed query helper for better TypeScript support
export async function query<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  if (!sql) {
    throw new Error('Database not available');
  }
  return sql(strings, ...values) as Promise<T[]>;
}

// Transaction helper
export async function transaction<T>(
  callback: (sqlFn: NeonQueryFunction<false, false>) => Promise<T>
): Promise<T> {
  if (!sql) {
    throw new Error('Database not available');
  }
  
  // Note: For complex transactions, you may need to use a pooled connection
  // This is a simplified version for basic operations
  return callback(sql);
}
