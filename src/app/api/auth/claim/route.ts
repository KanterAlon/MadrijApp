import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { supabase } from "@/lib/supabase";

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

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

  if (!madrij) {
    return NextResponse.json({ status: "missing" } satisfies ClaimStatus);
  }

  if (madrij.clerk_id && madrij.clerk_id === userId) {
    return NextResponse.json({ status: "ready" } satisfies ClaimStatus);
  }

  if (madrij.clerk_id && madrij.clerk_id !== userId) {
    return NextResponse.json({
      status: "claimed",
      nombre: madrij.nombre ?? null,
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
    nombre: madrij.nombre ?? null,
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

  const finalNombre = (providedNombre ?? madrij.nombre ?? email).trim() || email;

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
