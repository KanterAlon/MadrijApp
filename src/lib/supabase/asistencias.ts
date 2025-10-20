import { supabase } from "@/lib/supabase";
import { AccessDeniedError, ensureProyectoAccess } from "@/lib/supabase/access";

type SesionRow = {
  id: string;
  proyecto_id: string;
  nombre: string;
  inicio: string;
  fecha: string;
  madrij_id: string;
  finalizado: boolean;
  finalizado_at: string | null;
};

async function fetchSesionWithAccess(userId: string, sesionId: string) {
  const { data, error } = await supabase
    .from("asistencia_sesiones")
    .select("id, proyecto_id, nombre, inicio, fecha, madrij_id, finalizado, finalizado_at")
    .eq("id", sesionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Sesión no encontrada");
  }

  const access = await ensureProyectoAccess(userId, data.proyecto_id as string);
  return { sesion: data as SesionRow, access };
}

export async function crearSesion(
  userId: string,
  proyectoId: string,
  nombre: string,
  fecha: string,
  madrijId: string,
  inicio: string,
) {
  const access = await ensureProyectoAccess(userId, proyectoId);
  if (access.scope === "director") {
    throw new AccessDeniedError("Los directores no pueden crear sesiones de asistencia");
  }

  const { data, error } = await supabase
    .from("asistencia_sesiones")
    .insert({
      proyecto_id: proyectoId,
      nombre,
      fecha,
      madrij_id: madrijId,
      inicio,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSesion(userId: string, id: string) {
  const { sesion } = await fetchSesionWithAccess(userId, id);
  return sesion;
}

export async function getSesionActiva(userId: string, proyectoId: string) {
  await ensureProyectoAccess(userId, proyectoId);

  const { data, error } = await supabase
    .from("asistencia_sesiones")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .eq("finalizado", false)
    .order("inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function finalizarSesion(userId: string, id: string) {
  const { sesion, access } = await fetchSesionWithAccess(userId, id);
  if (access.scope === "director") {
    throw new AccessDeniedError("Los directores no pueden finalizar sesiones");
  }
  const { error } = await supabase
    .from("asistencia_sesiones")
    .update({ finalizado: true, finalizado_at: new Date().toISOString() })
    .eq("id", sesion.id);
  if (error) throw error;
}

export async function getAsistencias(userId: string, sesionId: string) {
  const { access } = await fetchSesionWithAccess(userId, sesionId);

  const { data, error } = await supabase
    .from("asistencias")
    .select("janij_id, presente")
    .eq("sesion_id", sesionId);
  if (error) throw error;

  let rows = data ?? [];
  if (access.scope === "madrij" && access.grupoIds.length > 0) {
    const janijIds = rows
      .map((row) => row.janij_id as string | null)
      .filter((id): id is string => Boolean(id));
    if (janijIds.length === 0) {
      return [];
    }
    const { data: janijRows, error: janijError } = await supabase
      .from("janijim")
      .select("id, grupo_id")
      .in("id", janijIds);
    if (janijError) throw janijError;
    const allowed = new Set(access.grupoIds);
    const allowedJanijIds = new Set(
      (janijRows ?? [])
        .map((row) => ({ id: row.id as string | null, grupo: row.grupo_id as string | null }))
        .filter((row): row is { id: string; grupo: string } => Boolean(row.id && row.grupo && allowed.has(row.grupo)))
        .map((row) => row.id),
    );
    rows = rows.filter((row) => row.janij_id && allowedJanijIds.has(row.janij_id as string));
  }

  return rows;
}

export async function marcarAsistencia(
  userId: string,
  sesionId: string,
  janijId: string,
  madrijId: string,
  presente: boolean,
) {
  const { sesion, access } = await fetchSesionWithAccess(userId, sesionId);
  if (access.scope === "director") {
    throw new AccessDeniedError("Los directores no pueden modificar la asistencia");
  }

  if (access.scope === "madrij") {
    if (access.grupoIds.length === 0) {
      throw new AccessDeniedError("No tenés grupos asignados en este proyecto");
    }
    const { data: janij, error: janijError } = await supabase
      .from("janijim")
      .select("grupo_id")
      .eq("id", janijId)
      .maybeSingle();
    if (janijError) throw janijError;
    const grupoId = janij?.grupo_id as string | null;
    if (!grupoId || !access.grupoIds.includes(grupoId)) {
      throw new AccessDeniedError("Solo podés actualizar asistencia para tus propios grupos");
    }
  }

  const { error } = await supabase.from("asistencias").upsert(
    {
      sesion_id: sesion.id,
      proyecto_id: sesion.proyecto_id,
      janij_id: janijId,
      madrij_id: madrijId,
      fecha: new Date().toISOString().split("T")[0],
      presente,
    },
    { onConflict: "sesion_id,janij_id" },
  );
  if (error) throw error;
}
