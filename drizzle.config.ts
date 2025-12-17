import { defineConfig } from "drizzle-kit";

// Use Supabase if available, otherwise fall back to Replit's PostgreSQL
let databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set");
}

// Remove sslmode from URL for Supabase (handled separately)
if (process.env.SUPABASE_DATABASE_URL && databaseUrl.includes('supabase')) {
  databaseUrl = databaseUrl.replace(/[?&]sslmode=[^&]*/g, '');
  databaseUrl = databaseUrl.replace(/\?$/, '').replace(/\?&/, '?').replace(/&&/g, '&');
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  },
});
