// Import this module only from server-side code, never from app.js.
import { neon } from '@neondatabase/serverless';

let database;
export function getDb() {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const error = new Error('DATABASE_URL is not configured.');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  database = neon(connectionString);
  return database;
}
