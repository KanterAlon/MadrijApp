import { supabase } from "@/lib/supabase";
import {
  AccessDeniedError,
  ensureProyectoAccess,
  getUserAccessContext,
  listAllProyectoIds,
  listProyectoMetadata,
} from "@/lib/supabase/access";

type RawProyecto = {
  id: string;
  nombre: string;
  creador_id: string;
};

function sortProyectos(data: RawProyecto[]) {
  return [...data].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function getProyectosParaUsuario(userId: string) {
  const context = await getUserAccessContext(userId);

  if (context.isAdmin || context.isDirector) {
    const ids = await listAllProyectoIds();
    if (ids.length === 0) return [] as RawProyecto[];
    const metadata = await listProyectoMetadata(ids);
    return sortProyectos((metadata ?? []) as RawProyecto[]);
  }

  const proyectoIds = new Set<string>();
  context.coordinatorProjectIds.forEach((id) => proyectoIds.add(id));
  for (const proyectoId of context.madrijProyectoGroups.keys()) {
    proyectoIds.add(proyectoId);
  }

  if (proyectoIds.size === 0) {
    return [] as RawProyecto[];
  }

  const metadata = await listProyectoMetadata(Array.from(proyectoIds));
  return sortProyectos((metadata ?? []) as RawProyecto[]);
}

export async function getGrupoIdsForProyecto(userId: string, proyectoId: string) {
  const { grupoIds } = await ensureProyectoAccess(userId, proyectoId);
  return grupoIds;
}

export async function renameProyecto(userId: string, id: string, nombre: string) {
  const access = await ensureProyectoAccess(userId, id);
  if (access.scope === "director" || access.scope === "madrij") {
    throw new AccessDeniedError("No tenés permisos para renombrar este proyecto");
  }
  const { error } = await supabase
    .from("proyectos")
    .update({ nombre })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProyecto(userId: string, id: string) {
  const access = await ensureProyectoAccess(userId, id);
  if (access.scope !== "admin") {
    throw new AccessDeniedError("Solo el administrador puede eliminar proyectos");
  }
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw error;
}
