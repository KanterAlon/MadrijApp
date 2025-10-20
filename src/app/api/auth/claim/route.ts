import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { normaliseEmail } from "@/lib/google/sheetData";
import { supabase } from "@/lib/supabase";

type AppRole = "madrij" | "coordinador" | "director" | "admin";

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

type ProyectoMatchRow = {
  role_id: string | null;
  proyecto?: {
    id: string | null;
    nombre: string | null;
  } | null;
};

type ClaimStatus =
  | { status: "ready"; roles: AppRole[] }
  | { status: "missing" }
  | { status: "needs_confirmation"; persona: ClaimPersona }
  | { status: "claimed"; nombre: string | null; roles: AppRole[] }
  | { status: "error"; message: string };

type ClaimPersona = {
  nombre: string | null;
  email: string;
  roles: AppRole[];
  grupos: {
    grupoId: string | null;
    grupoNombre: string | null;
    proyectoId: string | null;
    proyectoNombre: string | null;
    rol: string | null;
  }[];
  proyectos: {
    proyectoId: string | null;
    proyectoNombre: string | null;
  }[];
};

function mapGrupoRows(rows: GrupoMatchRow[] | null | undefined) {
  return (rows ?? []).map((row) => {
    const proyectos = Array.isArray(row.grupo?.proyectos) ? row.grupo!.proyectos! : [];
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

function mapProyectoRows(rows: ProyectoMatchRow[] | null | undefined) {
  const seen = new Set<string>();
  const proyectos: { proyectoId: string | null; proyectoNombre: string | null }[] = [];
  for (const row of rows ?? []) {
    const proyectoId = row.proyecto?.id ?? null;
    const proyectoNombre = row.proyecto?.nombre ?? null;
    const key = proyectoId ?? proyectoNombre ?? "";
    if (!key || seen.has(key)) continue;
    seen.add(key);
    proyectos.push({ proyectoId, proyectoNombre });
  }
  return proyectos;
}

function ensureNombre(value: string | null | undefined, email: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : email;
}

async function getRolesByEmail(email: string) {
  const { data, error } = await supabase
    .from("app_roles")
    .select("id, role, nombre, clerk_id, activo")
    .eq("email", email)
    .eq("activo", true);
  if (error) throw error;
  return data ?? [];
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

  const { data: initialMadrij, error: madrijError } = await supabase
    .from("madrijim")
    .select("id, clerk_id, email, nombre")
    .eq("email", email)
    .maybeSingle();

  if (madrijError) {
    console.error("Error fetching madrij", madrijError);
    return NextResponse.json({ status: "error", message: "No se pudo verificar el usuario" } satisfies ClaimStatus, {
      status: 500,
    });
  }

  const madrij = initialMadrij ?? null;

  const rolesRows = await getRolesByEmail(email);
  const roles = new Set<AppRole>();

  if (madrij) {
    roles.add("madrij");
  }
  for (const row of rolesRows) {
    const roleName = row.role as AppRole;
    roles.add(roleName);
  }

  if (roles.size === 0) {
    return NextResponse.json({ status: "missing" } satisfies ClaimStatus);
  }

  if (madrij?.clerk_id && madrij.clerk_id !== userId) {
    return NextResponse.json({
      status: "claimed",
      nombre: madrij.nombre ?? null,
      roles: Array.from(roles),
    } satisfies ClaimStatus);
  }

  const claimedByOtherRole = rolesRows.some(
    (row) => row.clerk_id && row.clerk_id !== userId,
  );
  if (claimedByOtherRole) {
    return NextResponse.json({
      status: "claimed",
      nombre: rolesRows[0]?.nombre ?? madrij?.nombre ?? null,
      roles: Array.from(roles),
    } satisfies ClaimStatus);
  }

  const claimedByUser =
    (madrij?.clerk_id && madrij.clerk_id === userId) || rolesRows.some((row) => row.clerk_id === userId);

  if (claimedByUser) {
    return NextResponse.json({ status: "ready", roles: Array.from(roles) } satisfies ClaimStatus);
  }

  const personaNombre = ensureNombre(madrij?.nombre ?? rolesRows[0]?.nombre ?? null, email);

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

  const coordinatorRoleIds = rolesRows
    .filter((row) => row.role === "coordinador")
    .map((row) => row.id as string);

  let proyectosPersona: { proyectoId: string | null; proyectoNombre: string | null }[] = [];
  if (coordinatorRoleIds.length > 0) {
    const { data: proyectos, error: proyectosError } = await supabase
      .from("proyecto_coordinadores")
      .select(
        `
          role_id,
          proyecto:proyectos (
            id,
            nombre
          )
        `,
      )
      .in("role_id", coordinatorRoleIds);

    if (proyectosError) {
      console.error("Error obteniendo proyectos del coordinador", proyectosError);
      return NextResponse.json(
        { status: "error", message: "No se pudieron obtener tus proyectos" } satisfies ClaimStatus,
        { status: 500 },
      );
    }
    proyectosPersona = mapProyectoRows(proyectos as ProyectoMatchRow[]);
  }

  const persona: ClaimPersona = {
    nombre: personaNombre,
    email,
    roles: Array.from(roles),
    grupos: mapGrupoRows(grupos as GrupoMatchRow[]),
    proyectos: proyectosPersona,
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

  const { data: madrij, error: madrijError } = await supabase
    .from("madrijim")
    .select("id, clerk_id, nombre, email")
    .eq("email", email)
    .maybeSingle();

  if (madrijError) {
    console.error("Error fetching madrij", madrijError);
    return NextResponse.json({ error: "No se pudo reclamar el usuario" }, { status: 500 });
  }

  const rolesRows = await getRolesByEmail(email);

  if (!madrij && rolesRows.length === 0) {
    return NextResponse.json({ error: "No se encontró un rol asociado a este email" }, { status: 404 });
  }

  if ((madrij?.clerk_id && madrij.clerk_id !== userId) || rolesRows.some((row) => row.clerk_id && row.clerk_id !== userId)) {
    return NextResponse.json({ error: "El usuario ya fue reclamado" }, { status: 409 });
  }

  const finalNombre = ensureNombre(
    providedNombre ?? madrij?.nombre ?? rolesRows[0]?.nombre ?? null,
    email,
  );

  if (madrij) {
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

    const { error: grupoError } = await supabase
      .from("madrijim_grupos")
      .update({
        madrij_id: userId,
        nombre: finalNombre,
        invitado: false,
        activo: true,
      })
      .eq("email", email);

    if (grupoError) {
      console.error("Error actualizando grupos", grupoError);
      return NextResponse.json({ error: "No se pudieron vincular los grupos" }, { status: 500 });
    }
  }

  if (rolesRows.length > 0) {
    const { error: roleUpdateError } = await supabase
      .from("app_roles")
      .update({ clerk_id: userId, nombre: finalNombre, activo: true })
      .eq("email", email);

    if (roleUpdateError) {
      console.error("Error actualizando roles", roleUpdateError);
      return NextResponse.json({ error: "No se pudieron vincular tus roles" }, { status: 500 });
    }
  }

  const refreshedRoles = await getRolesByEmail(email);
  const roleSet = new Set<AppRole>();
  if (madrij) roleSet.add("madrij");
  for (const row of refreshedRoles) {
    roleSet.add(row.role as AppRole);
  }

  return NextResponse.json({
    status: "claimed",
    nombre: finalNombre,
    roles: Array.from(roleSet),
  } satisfies ClaimStatus);
}
