import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { AccessDeniedError, ensureAdminAccess } from "@/lib/supabase/access";
import { commitAdminSyncRun } from "@/lib/sync/adminSync";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: runId } = await context.params;

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
    const { preview, result } = await commitAdminSyncRun(runId, userId);
    return NextResponse.json({ preview, result });
  } catch (err) {
    console.error("Error confirmando sincronización", err);
    const message = err instanceof Error ? err.message : "No se pudo completar la sincronización";
    const status = err instanceof Error && err.message.includes("procesada") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
