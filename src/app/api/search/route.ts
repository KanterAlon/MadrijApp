import { NextResponse } from "next/server";
import { matchNames } from "@/lib/name-matcher";

export async function POST(req: Request) {
  const { query, names } = await req.json();
  if (!query || !Array.isArray(names)) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }
  try {
    const matches = await matchNames(query, names);
    return NextResponse.json({ matches });
  } catch (err) {
    console.error("Matching error", err);
    return NextResponse.json({ matches: [] }, { status: 500 });
  }
}
