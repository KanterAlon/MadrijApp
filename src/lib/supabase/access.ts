import { supabase } from "@/lib/supabase";

export type AppRole = "madrij" | "coordinador" | "director" | "admin";

export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export type UserAccessContext = {
  roles: AppRole[];
  isAdmin: boolean;
  isDirector: boolean;
  coordinatorRoleIds: string[];
  coordinatorProjectIds: Set<string>;
  madrijGrupoIds: Set<string>;
  madrijProyectoGroups: Map<string, Set<string>>;
};

type ProyectoScopeInfo = {
  grupoIds: string[];
  appliesToAll: boolean;
};

async function fetchProyectoScopeInfo(proyectoId: string): Promise<ProyectoScopeInfo> {
  const { data: proyecto, error: proyectoError } = await supabase
    .from("proyectos")
    .select("applies_to_all, grupo_id")
    .eq("id", proyectoId)
    .maybeSingle();

  if (proyectoError) throw proyectoError;

  const appliesToAll = Boolean(proyecto?.applies_to_all);
  if (appliesToAll) {
    return { grupoIds: [], appliesToAll: true };
  }

  const { data, error } = await supabase
    .from("proyecto_grupos")
    .select("grupo_id")
    .eq("proyecto_id", proyectoId);

  if (error) throw error;

  const ids = (data ?? [])
    .map((row) => row.grupo_id as string | null)
    .filter((id): id is string => Boolean(id));

  if (ids.length > 0) {
    return { grupoIds: ids, appliesToAll: false };
  }

  const legacyGrupoId = proyecto?.grupo_id as string | null;
  if (legacyGrupoId) {
    return { grupoIds: [legacyGrupoId], appliesToAll: false };
  }

  return { grupoIds: [], appliesToAll: false };
}

export async function getUserAccessContext(userId: string): Promise<UserAccessContext> {
  const { data: roleRows, error: roleError } = await supabase
    .from("app_roles")
    .select("id, role")
    .eq("clerk_id", userId)
    .eq("activo", true);

  if (roleError) throw roleError;

  const roles = (roleRows ?? []).map((row) => row.role as AppRole);
  const isAdmin = roles.includes("admin");
  const isDirector = roles.includes("director");
  const coordinatorRoleIds = (roleRows ?? [])
    .filter((row) => row.role === "coordinador")
    .map((row) => row.id as string);

  const coordinatorProjectIds = new Set<string>();
  if (coordinatorRoleIds.length > 0) {
    const { data: coordinatorRows, error: coordinatorError } = await supabase
      .from("proyecto_coordinadores")
      .select("proyecto_id")
      .in("role_id", coordinatorRoleIds);

    if (coordinatorError) throw coordinatorError;

    for (const row of coordinatorRows ?? []) {
      if (row?.proyecto_id) {
        coordinatorProjectIds.add(row.proyecto_id as string);
      }
    }
  }

  const madrijGrupoIds = new Set<string>();
  const madrijProyectoGroups = new Map<string, Set<string>>();

  const { data: madrijRows, error: madrijError } = await supabase
    .from("madrijim_grupos")
    .select("grupo_id")
    .eq("madrij_id", userId)
    .eq("invitado", false)
    .eq("activo", true);

  if (madrijError) throw madrijError;

  const grupoIds = (madrijRows ?? [])
    .map((row) => row.grupo_id as string | null)
    .filter((id): id is string => Boolean(id));

  if (grupoIds.length > 0) {
    grupoIds.forEach((id) => madrijGrupoIds.add(id));

    const { data: proyectoLinks, error: linksError } = await supabase
      .from("proyecto_grupos")
      .select("proyecto_id, grupo_id")
      .in("grupo_id", grupoIds);

    if (linksError) throw linksError;

    const remaining = new Set(grupoIds);

    for (const link of proyectoLinks ?? []) {
      const proyectoId = link?.proyecto_id as string | null;
      const grupoId = link?.grupo_id as string | null;
      if (!proyectoId || !grupoId) continue;
      remaining.delete(grupoId);
      let list = madrijProyectoGroups.get(proyectoId);
      if (!list) {
        list = new Set<string>();
        madrijProyectoGroups.set(proyectoId, list);
      }
      list.add(grupoId);
    }

    if (remaining.size > 0) {
      const { data: legacyProjects, error: legacyError } = await supabase
        .from("proyectos")
        .select("id, grupo_id")
        .in("grupo_id", Array.from(remaining));

      if (legacyError) throw legacyError;

      for (const proyecto of legacyProjects ?? []) {
        const proyectoId = proyecto?.id as string | null;
        const grupoId = proyecto?.grupo_id as string | null;
        if (!proyectoId || !grupoId) continue;
        let list = madrijProyectoGroups.get(proyectoId);
        if (!list) {
          list = new Set<string>();
          madrijProyectoGroups.set(proyectoId, list);
        }
        list.add(grupoId);
      }
    }
  }

  return {
    roles,
    isAdmin,
    isDirector,
    coordinatorRoleIds,
    coordinatorProjectIds,
    madrijGrupoIds,
    madrijProyectoGroups,
  };
}

export type ProyectoAccessScope = "admin" | "director" | "coordinador" | "madrij";

export type ProyectoAccess = {
  scope: ProyectoAccessScope;
  grupoIds: string[];
  appliesToAll: boolean;
};

export async function ensureProyectoAccess(
  userId: string,
  proyectoId: string,
): Promise<ProyectoAccess> {
  const context = await getUserAccessContext(userId);

  if (context.isAdmin) {
    const scope = await fetchProyectoScopeInfo(proyectoId);
    return { scope: "admin", ...scope };
  }

  if (context.isDirector) {
    const scope = await fetchProyectoScopeInfo(proyectoId);
    return { scope: "director", ...scope };
  }

  if (context.coordinatorProjectIds.has(proyectoId)) {
    const scope = await fetchProyectoScopeInfo(proyectoId);
    return { scope: "coordinador", ...scope };
  }

  const grupos = context.madrijProyectoGroups.get(proyectoId);
  if (grupos && grupos.size > 0) {
    return { scope: "madrij", grupoIds: Array.from(grupos), appliesToAll: false };
  }

  throw new AccessDeniedError("No tenÃ©s acceso a este proyecto");
}

export async function listAllProyectoIds() {
  const { data, error } = await supabase.from("proyectos").select("id");
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.id as string | null)
    .filter((id): id is string => Boolean(id));
}

export type ProyectoMetadataRow = {
  id: string;
  nombre: string;
  creador_id: string | null;
  grupo_id: string | null;
  applies_to_all: boolean;
};

export async function listProyectoMetadata(ids: string[]): Promise<ProyectoMetadataRow[]> {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("proyectos")
    .select("id, nombre, creador_id, grupo_id, applies_to_all")
    .in("id", ids);

  if (error) throw error;
  return (data ?? []) as ProyectoMetadataRow[];
}

export async function fetchProyectoGruposByIds(grupoIds: string[]) {
  if (grupoIds.length === 0) {
    return [] as string[];
  }
  const { data, error } = await supabase
    .from("grupos")
    .select("id")
    .in("id", grupoIds);
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.id as string | null)
    .filter((id): id is string => Boolean(id));
}

export async function ensureAdminAccess(userId: string) {
  const context = await getUserAccessContext(userId);
  if (!context.isAdmin) {
    throw new AccessDeniedError("Solo el administrador de la aplicaciÃ³n puede realizar esta acciÃ³n");
  }
  return context;
}
