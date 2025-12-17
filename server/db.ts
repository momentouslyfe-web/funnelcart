import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use Supabase if available, otherwise fall back to Replit's PostgreSQL
let databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or SUPABASE_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Validate and fix URL format
if (process.env.SUPABASE_DATABASE_URL) {
  // Ensure the URL starts with proper protocol
  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    console.error("Warning: SUPABASE_DATABASE_URL should start with postgresql:// or postgres://");
    console.log("Falling back to Replit PostgreSQL database");
    databaseUrl = process.env.DATABASE_URL!;
    console.log("Using Replit PostgreSQL database");
  } else {
    // Log URL format for debugging (without password)
    try {
      const urlObj = new URL(databaseUrl);
      console.log(`Using Supabase PostgreSQL: ${urlObj.host}${urlObj.pathname}`);
    } catch (e) {
      console.error("Warning: Invalid Supabase URL format, falling back to Replit PostgreSQL");
      databaseUrl = process.env.DATABASE_URL!;
    }
  }
} else {
  console.log("Using Replit PostgreSQL database");
}

// Configure SSL for Supabase connections
const isSupabase = Boolean(process.env.SUPABASE_DATABASE_URL && databaseUrl.includes('supabase'));

// Remove sslmode from URL as it overrides the ssl config object
if (isSupabase) {
  databaseUrl = databaseUrl.replace(/[?&]sslmode=[^&]*/g, '');
  // Clean up any trailing ? or && from URL
  databaseUrl = databaseUrl.replace(/\?$/, '').replace(/\?&/, '?').replace(/&&/g, '&');
  console.log('SSL mode: enabled for Supabase (sslmode param removed, using ssl config)');
}

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig: pg.PoolConfig = {
  connectionString: databaseUrl,
  // Limit connections for serverless (Vercel) deployments
  max: isProduction ? 1 : 10,
};

if (isSupabase) {
  poolConfig.ssl = { rejectUnauthorized: false };
  // Disable prepared statements for Supabase transaction pooler (port 6543)
  // This is required because transaction mode doesn't support prepared statements
  poolConfig.statement_timeout = 0;
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
