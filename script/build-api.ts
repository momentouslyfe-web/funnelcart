import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

async function buildApi() {
  console.log("Building API for Vercel...");
  
  await build({
    entryPoints: [resolve(root, "api/index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outfile: resolve(root, "api-dist/index.mjs"),
    external: ["express", "@supabase/supabase-js", "pg", "drizzle-orm"],
    sourcemap: true,
  });
  
  console.log("API build complete: api-dist/index.mjs");
}

buildApi().catch(console.error);
