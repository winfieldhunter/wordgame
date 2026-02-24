import { NextRequest, NextResponse } from "next/server";
import { getSupabase, hasSupabase } from "@/server/stores/supabaseClient";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN = 6;

function generateCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return s;
}

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Groups require server storage." }, { status: 503 });
  }
  try {
    const body = await request.json();
    const sessionId = body?.sessionId;
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId required." }, { status: 400 });
    }

    const supabase = getSupabase();
    let code: string;
    for (let attempt = 0; attempt < 10; attempt++) {
      code = generateCode();
      const { error: insertCodeError } = await supabase.from("group_codes").insert({ code });
      if (insertCodeError) {
        if (insertCodeError.code === "23505") continue;
        throw insertCodeError;
      }
      const { error: memberError } = await supabase.from("group_members").insert({
        code,
        session_id: sessionId,
      });
      if (memberError) {
        await supabase.from("group_codes").delete().eq("code", code);
        throw memberError;
      }
      return NextResponse.json({ code });
    }
    return NextResponse.json({ error: "Could not create a unique code." }, { status: 500 });
  } catch (e) {
    console.error("Group create error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create group." },
      { status: 500 }
    );
  }
}
