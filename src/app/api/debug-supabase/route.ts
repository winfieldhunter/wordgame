import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { hasSupabase, getSupabase } from "@/server/stores/supabaseClient";

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

/**
 * GET /api/debug-supabase — Check if Supabase is configured and reachable.
 */
export async function GET() {
  const usingSupabase = hasSupabase();
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY);

  if (!usingSupabase) {
    const root = findProjectRoot();
    const envPath = join(root, ".env.local");
    const envExists = existsSync(envPath);
    let keysInFile: string[] = [];
    if (envExists) {
      try {
        const content = readFileSync(envPath, "utf8");
        keysInFile = content
          .split(/\r?\n/)
          .map((line) => {
            const eq = line.trim().indexOf("=");
            return eq > 0 ? line.trim().slice(0, eq).trim() : "";
          })
          .filter(Boolean);
      } catch {
        keysInFile = ["(could not read file)"];
      }
    }
    return NextResponse.json({
      usingSupabase: false,
      reason: !hasUrl ? "Missing NEXT_PUBLIC_SUPABASE_URL" : "Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)",
      hint: "Add both to .env.local and restart the dev server (npm run dev).",
      debug: {
        cwd: process.cwd(),
        projectRoot: root,
        envPath,
        envFileExists: envExists,
        keysFoundInEnvFile: keysInFile,
        envVarsSet: { hasUrl, hasKey },
      },
    });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("runs")
      .select("puzzle_id, session_id")
      .limit(1);
    if (error) {
      return NextResponse.json({
        usingSupabase: true,
        connected: false,
        error: error.message,
        code: error.code,
        hint: "Check your Supabase URL and service_role key. The key should be a long JWT (starts with eyJ...) from Project Settings → API → service_role.",
      });
    }
    return NextResponse.json({
      usingSupabase: true,
      connected: true,
      runsSample: data ?? [],
      hint: "If guesses still don’t appear, check the terminal where npm run dev is running for errors when you submit a guess.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      usingSupabase: true,
      connected: false,
      error: message,
      hint: "Fix the error above. Common: wrong service_role key (use the long JWT from Supabase Dashboard → Settings → API).",
    });
  }
}
