import { NextRequest, NextResponse } from "next/server";
import { getSupabase, hasSupabase } from "@/server/stores/supabaseClient";

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Groups require server storage." }, { status: 503 });
  }
  try {
    const body = await request.json();
    const sessionId = body?.sessionId;
    const code = body?.code?.trim()?.toUpperCase();
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId required." }, { status: 400 });
    }
    if (!code || code.length < 4) {
      return NextResponse.json({ error: "Valid group code required." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: group } = await supabase.from("group_codes").select("code").eq("code", code).single();
    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    await supabase.from("group_members").upsert(
      { code, session_id: sessionId },
      { onConflict: "code,session_id" }
    );
    return NextResponse.json({ ok: true, code });
  } catch (e) {
    console.error("Group join error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to join group." },
      { status: 500 }
    );
  }
}
