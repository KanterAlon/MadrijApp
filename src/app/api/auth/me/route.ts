import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("app_roles")
    .select("role")
    .eq("clerk_id", userId)
    .eq("activo", true);

  if (error) {
    console.error("Error obteniendo roles", error);
    return NextResponse.json({ error: "No se pudieron obtener los roles" }, { status: 500 });
  }

  const roles = (data ?? []).map((row) => row.role) as string[];
  return NextResponse.json({ roles });
}
