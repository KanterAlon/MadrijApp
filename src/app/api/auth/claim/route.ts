import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { loadSheetsData, normaliseEmail } from "@/lib/google/sheetData";
import { syncGroupFromSheets } from "@/lib/sync/sheetsSync";
import { supabase } from "@/lib/supabase";

type GrupoMatchRow = {
  grupo_id: string | null;
  nombre: string | null;
  rol: string | null;
  grupo?: {
    id: string;
    nombre: string | null;
    proyectos?: { id: string; nombre: string | null }[] | null;
  } | null;
};

type ClaimStatus =
  | { status: "ready" }
  | { status: "missing" }
  | { status: "needs_confirmation"; persona: ClaimPersona }
  | { status: "claimed"; nombre: string | null }
  | { status: "error"; message: string };

type ClaimPersona = {
  nombre: string | null;
  email: string;
  grupos: {
    grupoId: string | null;
    grupoNombre: string | null;
    proyectoId: string | null;
    proyectoNombre: string | null;
    rol: string | null;
  }[];
};

function mapGrupoRows(rows: GrupoMatchRow[] | null | undefined) {
  return (rows ?? []).map((row) => {
    const proyectos = Array.isArray(row.grupo?.proyectos)
      ? row.grupo!.proyectos!
      : [];
    const proyecto = proyectos.find(Boolean) ?? null;
    return {
      grupoId: row.grupo_id,
      grupoNombre: row.grupo?.nombre ?? null,
      proyectoId: proyecto?.id ?? null,
      proyectoNombre: proyecto?.nombre ?? null,
      rol: row.rol ?? null,
    };
  });
}

function ensureNombre(value: string | null | undefined, email: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : email;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const emailParam = searchParams.get("email");
  if (!emailParam) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const email = normaliseEmail(emailParam);
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const { data: madrij, error } = await supabase
    .from("madrijim")
    .select("id, clerk_id, email, nombre")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Error fetching madrij", error);
    return NextResponse.json({ status: "error", message: "No se pudo verificar el usuario" } satisfies ClaimStatus, {
      status: 500,
    });
  }
  if (madrij?.clerk_id && madrij.clerk_id === userId) {
    return NextResponse.json({ status: "ready" } satisfies ClaimStatus);
  }

  if (madrij?.clerk_id && madrij.clerk_id !== userId) {
    return NextResponse.json({
      status: "claimed",
      nombre: madrij.nombre ?? null,
    } satisfies ClaimStatus);
  }

  const sheetsData = await loadSheetsData();
  const personaEntries = sheetsData.madrijes.filter((entry) => entry.email === email);

  if (personaEntries.length === 0) {
    return NextResponse.json({ status: "missing" } satisfies ClaimStatus);
  }

  const personaNombre = ensureNombre(personaEntries[0]?.nombre ?? null, email);
  const gruposMap = new Map<string, string>();
  for (const entry of personaEntries) {
    if (entry.grupoKey) {
      gruposMap.set(entry.grupoKey, entry.grupoNombre);
    }
  }

  if (gruposMap.size === 0) {
    return NextResponse.json({ status: "missing" } satisfies ClaimStatus);
  }

  try {
    for (const [, grupoNombre] of gruposMap) {
      await syncGroupFromSheets(grupoNombre, { data: sheetsData });
    }
  } catch (syncError) {
    console.error("Error sincronizando grupo para claim", syncError);
    return NextResponse.json({
      status: "error",
      message: "No se pudo preparar tu información desde la hoja",
    } satisfies ClaimStatus, {
      status: 500,
    });
  }

  const { error: upsertError } = await supabase
    .from("madrijim")
    .upsert({ email, nombre: personaNombre }, { onConflict: "email" });

  if (upsertError) {
    console.error("Error guardando madrij", upsertError);
    return NextResponse.json({ status: "error", message: "No se pudo preparar tu usuario" } satisfies ClaimStatus, {
      status: 500,
    });
  }

  const { data: refreshed, error: refreshedError } = await supabase
    .from("madrijim")
    .select("id, clerk_id, nombre")
    .eq("email", email)
    .maybeSingle();

  if (refreshedError) {
    console.error("Error refrescando madrij", refreshedError);
    return NextResponse.json({ status: "error", message: "No se pudo preparar tu usuario" } satisfies ClaimStatus, {
      status: 500,
    });
  }

  if (refreshed?.clerk_id && refreshed.clerk_id === userId) {
    return NextResponse.json({ status: "ready" } satisfies ClaimStatus);
  }

  if (refreshed?.clerk_id && refreshed.clerk_id !== userId) {
    return NextResponse.json({
      status: "claimed",
      nombre: refreshed.nombre ?? null,
    } satisfies ClaimStatus);
  }

  const { data: grupos, error: gruposError } = await supabase
    .from("madrijim_grupos")
    .select(
      `nombre, rol, grupo_id, grupo:grupos (
        id,
        nombre,
        proyectos (
          id,
          nombre
        )
      )`,
    )
    .eq("email", email)
    .eq("activo", true);

  if (gruposError) {
    console.error("Error fetching grupos", gruposError);
    return NextResponse.json({ status: "error", message: "No se pudieron obtener tus grupos" } satisfies ClaimStatus, {
      status: 500,
    });
  }

  const persona: ClaimPersona = {
    nombre: refreshed?.nombre ?? personaNombre,
    email,
    grupos: mapGrupoRows(grupos as GrupoMatchRow[]),
  };

  return NextResponse.json({ status: "needs_confirmation", persona } satisfies ClaimStatus);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email: rawEmail, nombre: providedNombre } = (await req.json().catch(() => ({}))) as {
    email?: string;
    nombre?: string;
  };

  if (!rawEmail) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const email = normaliseEmail(rawEmail);
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const { data: madrij, error } = await supabase
    .from("madrijim")
    .select("id, clerk_id, nombre, email")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Error fetching madrij", error);
    return NextResponse.json({ error: "No se pudo reclamar el usuario" }, { status: 500 });
  }

  if (!madrij) {
    return NextResponse.json({ error: "Madrij no encontrado" }, { status: 404 });
  }

  if (madrij.clerk_id && madrij.clerk_id !== userId) {
    return NextResponse.json({ error: "El usuario ya fue reclamado" }, { status: 409 });
  }

  const finalNombre = ensureNombre(providedNombre ?? madrij.nombre, email);

  const { error: updateError } = await supabase
    .from("madrijim")
    .upsert(
      {
        id: madrij.id,
        email,
        nombre: finalNombre,
        clerk_id: userId,
      },
      { onConflict: "email" },
    );

  if (updateError) {
    console.error("Error updating madrij", updateError);
    return NextResponse.json({ error: "No se pudo guardar el usuario" }, { status: 500 });
  }

  const { data: updatedGrupos, error: grupoError } = await supabase
    .from("madrijim_grupos")
    .update({
      madrij_id: userId,
      nombre: finalNombre,
      invitado: false,
      activo: true,
    })
    .eq("email", email)
    .select("grupo_id");

  if (grupoError) {
    console.error("Error actualizando grupos", grupoError);
    return NextResponse.json({ error: "No se pudieron vincular los grupos" }, { status: 500 });
  }

  return NextResponse.json({
    status: "claimed",
    grupos: (updatedGrupos ?? []).map((row) => row.grupo_id),
  } satisfies ClaimStatus);
}
