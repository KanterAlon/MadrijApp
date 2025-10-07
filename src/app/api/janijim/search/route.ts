import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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
    const results = await searchJanijimGlobal(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching janijim", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
