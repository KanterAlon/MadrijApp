import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AccessDeniedError } from "@/lib/supabase/access";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-server";
import { matchNames } from "@/lib/name-matcher";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  try {
    const data = await getMadrijimPorProyecto(userId, id);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query, names } = await req.json();
  if (!query || !Array.isArray(names)) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }
  const MAX_NAMES = 1000;
  const trimmedNames = names.slice(0, MAX_NAMES);
  try {
    const matches = await matchNames(query, trimmedNames);
    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json({ matches: [] }, { status: 500 });
  }
}
