import { supabase } from "@/lib/supabase";
import {
  AccessDeniedError,
  ProyectoAccessScope,
  ensureProyectoAccess,
  getUserAccessContext,
  listAllProyectoIds,
  listProyectoMetadata,
  type ProyectoMetadataRow,
} from "@/lib/supabase/access";

type DashboardGrupo = {
  id: string;
  nombre: string;
};

export type DashboardProyecto = {
  id: string;
  nombre: string;
  creador_id: string | null;
  roles: ProyectoAccessScope[];
  grupos: DashboardGrupo[];
};

const ROLE_PRIORITY: Record<ProyectoAccessScope, number> = {
  admin: 4,
  director: 3,
  coordinador: 2,
  madrij: 1,
};

function sortProyectos<T extends { nombre: string }>(data: T[]): T[] {
  return [...data].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function sortRoles(set: Set<ProyectoAccessScope>) {
  return Array.from(set).sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a]);
}

export async function getProyectosParaUsuario(userId: string): Promise<DashboardProyecto[]> {
  const context = await getUserAccessContext(userId);

  const rolesByProyecto = new Map<string, Set<ProyectoAccessScope>>();
  const addRole = (proyectoId: string, role: ProyectoAccessScope) => {
    let roles = rolesByProyecto.get(proyectoId);
    if (!roles) {
      roles = new Set<ProyectoAccessScope>();
      rolesByProyecto.set(proyectoId, roles);
    }
    roles.add(role);
  };

  context.coordinatorProjectIds.forEach((id) => addRole(id, "coordinador"));
  for (const proyectoId of context.madrijProyectoGroups.keys()) {
    addRole(proyectoId, "madrij");
  }

  let proyectoIds: string[] = [];

  if (context.isAdmin || context.isDirector) {
    const ids = await listAllProyectoIds();
    if (ids.length === 0) {
      return [];
    }
    proyectoIds = Array.from(new Set([...ids, ...rolesByProyecto.keys()]));
    if (context.isAdmin) {
      ids.forEach((id) => addRole(id, "admin"));
    }
    if (context.isDirector) {
      ids.forEach((id) => addRole(id, "director"));
    }
  } else {
    proyectoIds = Array.from(rolesByProyecto.keys());
    if (proyectoIds.length === 0) {
      return [];
    }
  }

  if (proyectoIds.length === 0) {
    return [];
  }

  const metadata = await listProyectoMetadata(proyectoIds);
  const metadataById = new Map<string, ProyectoMetadataRow>();
  for (const row of metadata) {
    metadataById.set(row.id, row);
    if (!rolesByProyecto.has(row.id) && context.isAdmin) {
      addRole(row.id, "admin");
    }
    if (!rolesByProyecto.has(row.id) && context.isDirector) {
      addRole(row.id, "director");
    }
  }

  const linkMap = new Map<string, Set<string>>();
  const allGroupIds = new Set<string>();

  const { data: linkRows, error: linkError } = await supabase
    .from("proyecto_grupos")
    .select("proyecto_id, grupo_id")
    .in("proyecto_id", proyectoIds);

  if (linkError) throw linkError;

  for (const row of linkRows ?? []) {
    const proyectoId = row.proyecto_id as string | null;
    const grupoId = row.grupo_id as string | null;
    if (!proyectoId || !grupoId) continue;
    let set = linkMap.get(proyectoId);
    if (!set) {
      set = new Set<string>();
      linkMap.set(proyectoId, set);
    }
    set.add(grupoId);
    allGroupIds.add(grupoId);
  }

  for (const row of metadata) {
    const legacyGrupoId = row.grupo_id;
    if (legacyGrupoId) {
      let set = linkMap.get(row.id);
      if (!set) {
        set = new Set<string>();
        linkMap.set(row.id, set);
      }
      set.add(legacyGrupoId);
      allGroupIds.add(legacyGrupoId);
    }
  }

  const grupoInfo = new Map<string, DashboardGrupo>();
  if (allGroupIds.size > 0) {
    const { data: grupos, error: gruposError } = await supabase
      .from("grupos")
      .select("id, nombre")
      .in("id", Array.from(allGroupIds));

    if (gruposError) throw gruposError;

    for (const grupo of grupos ?? []) {
      if (!grupo?.id) continue;
      grupoInfo.set(grupo.id as string, {
        id: grupo.id as string,
        nombre: (grupo.nombre as string) ?? "",
      });
    }
  }

  const proyectos: DashboardProyecto[] = [];

  for (const proyectoId of proyectoIds) {
    const meta = metadataById.get(proyectoId);
    if (!meta) continue;

    const roles = rolesByProyecto.get(proyectoId) ?? new Set<ProyectoAccessScope>();
    if (roles.size === 0) {
      if (context.isAdmin) {
        roles.add("admin");
      } else if (context.isDirector) {
        roles.add("director");
      }
    }

    const allProjectGroupIds = Array.from(linkMap.get(proyectoId) ?? []);
    let visibleGroupIds: string[] = [];

    if (roles.has("admin") || roles.has("coordinador") || roles.has("director")) {
      visibleGroupIds = allProjectGroupIds;
    } else if (roles.has("madrij")) {
      const allowed = context.madrijProyectoGroups.get(proyectoId);
      if (allowed && allowed.size > 0) {
        visibleGroupIds = Array.from(allowed);
      } else {
        visibleGroupIds = allProjectGroupIds.filter((id) => context.madrijGrupoIds.has(id));
      }
    }

    const grupos = sortProyectos(
      visibleGroupIds
        .map((id) => grupoInfo.get(id))
        .filter((grupo): grupo is DashboardGrupo => Boolean(grupo)),
    );

    proyectos.push({
      id: meta.id,
      nombre: meta.nombre,
      creador_id: meta.creador_id,
      roles: sortRoles(roles),
      grupos,
    });
  }

  return sortProyectos(proyectos);
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
