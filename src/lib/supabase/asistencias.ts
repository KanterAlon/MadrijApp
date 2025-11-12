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

type JanijGroupMap = Map<string, string | null>;

function normalizeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

async function fetchJanijGroups(ids: string[]): Promise<JanijGroupMap> {
  const uniqueIds = normalizeIds(ids);
  const map: JanijGroupMap = new Map();
  if (uniqueIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("janijim")
    .select("id, grupo_id")
    .in("id", uniqueIds);
  if (error) throw error;

  for (const row of data ?? []) {
    const janijId = row?.id as string | null;
    if (!janijId) continue;
    map.set(janijId, (row?.grupo_id as string | null) ?? null);
  }

  return map;
}

function isJanijAllowed(janijId: string, groups: JanijGroupMap, allowed: Set<string>) {
  if (allowed.size === 0) {
    return false;
  }
  const grupoId = groups.get(janijId);
  return Boolean(grupoId && allowed.has(grupoId));
}

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
    const allowed = new Set(access.grupoIds);
    const groups = await fetchJanijGroups(janijIds);
    rows = rows.filter((row) => {
      const janijId = row.janij_id as string | null;
      return janijId ? isJanijAllowed(janijId, groups, allowed) : false;
    });
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
      throw new AccessDeniedError("No tenes grupos asignados en este proyecto");
    }
    const allowed = new Set(access.grupoIds);
    const groups = await fetchJanijGroups([janijId]);
    if (!isJanijAllowed(janijId, groups, allowed)) {
      throw new AccessDeniedError("Solo podes actualizar asistencia para tus propios grupos");
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
