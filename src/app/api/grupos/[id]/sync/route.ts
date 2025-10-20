import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { loadSheetsData } from "@/lib/google/sheetData";
import { syncGroupFromSheets } from "@/lib/sync/sheetsSync";
import { supabase } from "@/lib/supabase";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: grupoId } = await context.params;
    if (!grupoId) {
      return NextResponse.json({ error: "Missing grupo" }, { status: 400 });
    }

    const { data: grupo, error: grupoError } = await supabase
      .from("grupos")
      .select("id, nombre")
      .eq("id", grupoId)
      .maybeSingle();

    if (grupoError || !grupo) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("madrijim_grupos")
      .select("id")
      .eq("grupo_id", grupoId)
      .eq("madrij_id", userId)
      .eq("activo", true)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nombre = grupo.nombre?.trim();
    if (!nombre) {
      return NextResponse.json({ error: "El grupo no tiene un nombre configurado" }, { status: 400 });
    }

    const sheetsData = await loadSheetsData().catch((sheetsError) => {
      console.error("Error leyendo la hoja de calculo", sheetsError);
      return null;
    });

    if (!sheetsData) {
      return NextResponse.json(
        {
          error:
            "No se pudo acceder a la hoja de calculo institucional. Revisa la configuracion de la cuenta de servicio de Google.",
        },
        { status: 500 },
      );
    }
    const result = await syncGroupFromSheets(nombre, {
      expectedGrupoId: grupoId,
      data: sheetsData,
    });

    return NextResponse.json({
      janijim: result.janijim,
      madrijim: result.madrijim,
    });
  } catch (error) {
    console.error("Sync error", error);
    return NextResponse.json({ error: "Error sincronizando" }, { status: 500 });
  }
}
