import { NextResponse } from "next/server";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-server";
import { matchNames } from "@/lib/name-matcher";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  try {
    const data = await getMadrijimPorProyecto(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching madrijim", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { query, names } = await req.json();
  if (!query || !Array.isArray(names)) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }
  const MAX_NAMES = 1000;
  const trimmedNames = names.slice(0, MAX_NAMES);
  try {
    const matches = await matchNames(query, trimmedNames);
    return NextResponse.json({ matches });
  } catch (err) {
    console.error("Matching error", err);
    return NextResponse.json({ matches: [] }, { status: 500 });
  }
}
