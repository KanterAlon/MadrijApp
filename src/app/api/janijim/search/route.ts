import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AccessDeniedError } from "@/lib/supabase/access";
import { searchJanijimGlobal } from "@/lib/supabase/janijim";

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchJanijimGlobal(userId, query);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
