import { pool } from "./db";

export async function migrateSchema() {
  const client = await pool.connect();
  try {
    console.log("Running schema migrations...");
    
    const migrations = [
      {
        name: "create sessions table",
        query: `
          CREATE TABLE IF NOT EXISTS sessions (
            sid VARCHAR NOT NULL PRIMARY KEY,
            sess JSON NOT NULL,
            expire TIMESTAMP(6) NOT NULL
          );
          CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
        `
      },
      {
        name: "add trial columns to subscription_plans",
        query: `
          DO $$ BEGIN
            ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN DEFAULT false;
            ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;
            ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS whitelabel_allowed BOOLEAN DEFAULT false;
            ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS monthly_order_limit INTEGER;
          EXCEPTION WHEN duplicate_column THEN NULL;
          END $$;
        `
      },
      {
        name: "add google_id column to users",
        query: `
          DO $$ BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
          EXCEPTION WHEN duplicate_column THEN NULL;
          END $$;
        `
      },
      {
        name: "add seller columns to users",
        query: `
          DO $$ BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'free';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT;
          EXCEPTION WHEN duplicate_column THEN NULL;
          END $$;
        `
      },
      {
        name: "create platform_payment_gateways table",
        query: `
          CREATE TABLE IF NOT EXISTS platform_payment_gateways (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            provider TEXT NOT NULL,
            display_name TEXT,
            api_key TEXT,
            api_url TEXT,
            webhook_secret TEXT,
            is_test_mode BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true,
            is_primary BOOLEAN DEFAULT false,
            supported_currencies TEXT[] DEFAULT ARRAY['BDT'],
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: "create seller_payments table",
        query: `
          CREATE TABLE IF NOT EXISTS seller_payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            plan_id UUID REFERENCES subscription_plans(id),
            amount DECIMAL(10,2) NOT NULL,
            currency TEXT DEFAULT 'BDT',
            payment_method TEXT DEFAULT 'uddoktapay',
            transaction_id TEXT,
            invoice_id TEXT,
            status TEXT DEFAULT 'pending',
            payment_type TEXT DEFAULT 'subscription',
            metadata JSONB,
            paid_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: "add supabase_id column to users",
        query: `
          DO $$ BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id TEXT UNIQUE;
          EXCEPTION WHEN duplicate_column THEN NULL;
          END $$;
        `
      },
      {
        name: "make password nullable for OAuth users",
        query: `
          ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
        `
      }
    ];

    for (const migration of migrations) {
      try {
        await client.query(migration.query);
        console.log(`Migration completed: ${migration.name}`);
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          console.warn(`Migration warning for ${migration.name}:`, error.message);
        }
      }
    }
    
    console.log("Schema migrations completed");
  } finally {
    client.release();
  }
}
