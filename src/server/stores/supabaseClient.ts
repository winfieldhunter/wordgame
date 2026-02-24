import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

/** Find project root (directory containing package.json) by walking up from cwd. */
function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** Load .env.local from project root so Supabase vars are available even if Next didn't load them. */
function loadEnvLocal(): void {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const dir = findProjectRoot();
    const envPath = join(dir, ".env.local");
    if (!existsSync(envPath)) return;
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key && value && !process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

// Use only env vars (set in .env.local or Vercel). No hardcoded secrets.
function getUrl(): string | undefined {
  loadEnvLocal();
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
}

function getServiceKey(): string | undefined {
  loadEnvLocal();
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
}

export function getSupabase() {
  const url = getUrl();
  const serviceKey = getServiceKey();
  if (!url || !serviceKey) {
    throw new Error("Supabase URL and key (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY) required.");
  }
  return createClient(url, serviceKey);
}

export function hasSupabase(): boolean {
  return Boolean(getUrl() && getServiceKey());
}
