import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.SUPABASE_DATABASE_URL,
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      nodeVersion: process.version
    }
  });
}
