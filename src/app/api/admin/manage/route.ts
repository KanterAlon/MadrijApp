import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { saveSheetsData } from "@/lib/google/sheetWriter";
import {
  loadSheetsData,
  normaliseEmail,
  type SheetsData,
} from "@/lib/google/sheetData";
import { supabase } from "@/lib/supabase";
import { AccessDeniedError, ensureAdminAccess } from "@/lib/supabase/access";
import { applySheetsDataDirectly } from "@/lib/sync/adminSync";

async function ensureAdmin(userId: string | null) {
  if (!userId) {
    throw new AccessDeniedError("Necesitás iniciar sesión como administrador");
  }
  await ensureAdminAccess(userId);
}

export async function GET() {
  const { userId } = await auth();

  try {
    await ensureAdmin(userId);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "No se pudieron verificar los permisos" }, { status: 500 });
  }

  try {
    const [sheets, janijCount, madCount, gruposCount, proyectosCount, rolesCount] = await Promise.all([
      loadSheetsData(),
      supabase.from("janijim").select("id", { count: "exact", head: true }).eq("activo", true),
      supabase.from("madrijim_grupos").select("id", { count: "exact", head: true }).eq("activo", true),
      supabase.from("grupos").select("id", { count: "exact", head: true }),
      supabase.from("proyectos").select("id", { count: "exact", head: true }),
      supabase.from("app_roles").select("id", { count: "exact", head: true }).eq("activo", true),
    ]);

    if (janijCount.error) throw janijCount.error;
    if (madCount.error) throw madCount.error;
    if (gruposCount.error) throw gruposCount.error;
    if (proyectosCount.error) throw proyectosCount.error;
    if (rolesCount.error) throw rolesCount.error;

    return NextResponse.json({
      sheets,
      summary: {
        supabase: {
          janijimActivos: janijCount.count ?? 0,
          madrijimActivos: madCount.count ?? 0,
          gruposRegistrados: gruposCount.count ?? 0,
          proyectosRegistrados: proyectosCount.count ?? 0,
          rolesActivos: rolesCount.count ?? 0,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los datos" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();

  try {
    await ensureAdmin(userId);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "No se pudieron verificar los permisos" }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud es inválido" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || !("sheets" in payload)) {
    return NextResponse.json({ error: "Se requieren los datos de la hoja" }, { status: 400 });
  }

  const sheets = (payload as { sheets: SheetsData }).sheets;

  try {
    await saveSheetsData(sheets);
    const result = await applySheetsDataDirectly(sheets);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "No se pudieron aplicar los cambios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  try {
    await ensureAdmin(userId);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "No se pudieron verificar los permisos" }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud es inválido" }, { status: 400 });
  }

  const action = typeof payload === "object" && payload && "action" in payload ? (payload as { action: string }).action : null;

  if (action !== "reset") {
    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  }

  const adminIdentity = await (async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("app_roles")
      .select("email, nombre")
      .eq("role", "admin")
      .eq("clerk_id", userId)
      .maybeSingle();
    if (error) {
    }
    if (data) {
      const email = typeof data.email === "string" ? normaliseEmail(data.email) : null;
      return email
        ? {
            email,
            nombre: (typeof data.nombre === "string" && data.nombre.trim().length > 0
              ? data.nombre.trim()
              : null) ?? null,
          }
        : null;
    }
    if (!userId) return null;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const email = user?.primaryEmailAddress?.emailAddress ?? null;
      if (!email) return null;
      const nombre = user?.fullName?.trim();
      return { email: normaliseEmail(email), nombre: nombre && nombre.length > 0 ? nombre : null };
    } catch {
      return null;
    }
  })();

  async function ensureAdminRestored() {
    if (!userId) return;
    if (!adminIdentity) {
      const { error } = await supabase
        .from("app_roles")
        .update({ activo: true })
        .eq("clerk_id", userId)
        .eq("role", "admin");
      if (error) {
      }
      return;
    }
    const { email, nombre } = adminIdentity;
    const payload = {
      email,
      nombre: nombre ?? email,
      role: "admin" as const,
      clerk_id: userId,
      activo: true,
    };
    const { error } = await supabase
      .from("app_roles")
      .upsert(payload, { onConflict: "email,role" });
    if (error) {
    }
  }

  try {
    const resetResults = await Promise.all([
      supabase.from("janijim").update({ activo: false }).eq("activo", true),
      supabase.from("madrijim_grupos").update({ activo: false }).eq("activo", true),
      supabase.from("app_roles").update({ activo: false }).eq("activo", true),
      supabase
        .from("proyecto_coordinadores")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
    ] as const);

    for (const result of resetResults) {
      if (result.error) throw result.error;
    }

    const sheets = await loadSheetsData();

    if (adminIdentity) {
      const adminEmail = normaliseEmail(adminIdentity.email);
      const alreadyPresent = sheets.admins.some(
        (admin) => normaliseEmail(admin.email) === adminEmail,
      );
      if (!alreadyPresent) {
        sheets.admins.push({
          email: adminEmail,
          nombre: adminIdentity.nombre ?? adminEmail,
        });
      }
    }

    const result = await applySheetsDataDirectly(sheets);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "No se pudo reinicializar la base" }, { status: 500 });
  } finally {
    await ensureAdminRestored();
  }
}
