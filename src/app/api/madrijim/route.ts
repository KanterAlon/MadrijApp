import { NextResponse } from "next/server";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-client";


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  try {
    const madrijim = await getMadrijimPorProyecto(id);
    return NextResponse.json(madrijim);
  } catch (err) {
    console.error("Error fetching madrijim", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
