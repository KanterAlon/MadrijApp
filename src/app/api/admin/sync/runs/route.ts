import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { AccessDeniedError, ensureAdminAccess } from "@/lib/supabase/access";
import { createAdminSyncRun } from "@/lib/sync/adminSync";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureAdminAccess(userId);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Error verificando permisos de administrador", err);
    return NextResponse.json({ error: "No se pudo verificar el rol del usuario" }, { status: 500 });
  }

  try {
    const { runId, preview } = await createAdminSyncRun(userId);
    return NextResponse.json({ runId, preview });
  } catch (err) {
    console.error("Error generando vista previa de sincronización", err);
    return NextResponse.json({ error: "No se pudo generar la vista previa" }, { status: 500 });
  }
}
