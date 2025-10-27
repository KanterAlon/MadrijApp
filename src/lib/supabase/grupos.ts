import { supabase } from "@/lib/supabase";
import { AccessDeniedError, ensureProyectoAccess } from "@/lib/supabase/access";
import { isMissingRelationError } from "@/lib/supabase/errors";
import { parseJanijExtras } from "@/lib/sync/janijExtras";

export type Grupo = {
  id: string;
  nombre: string;
  spreadsheet_id: string | null;
  janij_sheet: string | null;
  madrij_sheet: string | null;
};

export type GrupoQuickStats = {
  id: string;
  nombre: string;
  totalJanijim: number;
  totalMadrijim: number;
};

export type GrupoMadrijInfo = {
  id: string | null;
  nombre: string;
  email: string | null;
  rol: string | null;
  invitado: boolean;
};

export type GrupoCoordinadorInfo = {
  nombre: string;
  email: string;
};

export type GrupoDetalle = {
  id: string;
  nombre: string;
  totalJanijim: number;
  totalMadrijim: number;
  madrijim: GrupoMadrijInfo[];
  coordinadores: GrupoCoordinadorInfo[];
};

type MadrijGrupoRow = {
  grupo_id?: string | null;
  madrij_id?: string | null;
  nombre?: string | null;
  email?: string | null;
  rol?: string | null;
  invitado?: boolean | null;
  madrij?: {
    clerk_id?: string | null;
    nombre?: string | null;
    email?: string | null;
  } | null;
};

export async function getGruposByProyecto(proyectoId: string, userId: string) {
  const { grupoIds } = await ensureProyectoAccess(userId, proyectoId);
  if (grupoIds.length === 0) return [] as Grupo[];

  const { data, error } = await supabase
    .from("grupos")
    .select("id, nombre, spreadsheet_id, janij_sheet, madrij_sheet")
    .in("id", grupoIds);

  if (error) throw error;

  const map = new Map<string, Grupo>();
  for (const row of data ?? []) {
    map.set(row.id as string, {
      id: row.id as string,
      nombre: row.nombre as string,
      spreadsheet_id: row.spreadsheet_id ?? null,
      janij_sheet: row.janij_sheet ?? null,
      madrij_sheet: row.madrij_sheet ?? null,
    });
  }

  return grupoIds
    .map((id) => map.get(id))
    .filter((grupo): grupo is Grupo => Boolean(grupo));
}

export async function listProjectGroupIds(proyectoId: string) {
  const { data: proyectoRow, error: proyectoError } = await supabase
    .from("proyectos")
    .select("grupo_id")
    .eq("id", proyectoId)
    .maybeSingle();

  if (proyectoError) throw proyectoError;

  if (!proyectoRow) {
    return [];
  }

  const ids = new Set<string>();

  const { data: linkRows, error: linkError } = await supabase
    .from("proyecto_grupos")
    .select("grupo_id")
    .eq("proyecto_id", proyectoId);

  if (linkError) throw linkError;

  for (const row of linkRows ?? []) {
    const id = row?.grupo_id as string | null;
    if (id) {
      ids.add(id);
    }
  }

  const legacyId = proyectoRow?.grupo_id as string | null;
  if (legacyId) {
    ids.add(legacyId);
  }

  return Array.from(ids);
}

async function countActiveJanijByGroup(groupIds: string[]): Promise<Map<string, number>> {
  if (groupIds.length === 0) {
    return new Map();
  }

  const groupSet = new Set(groupIds);
  const membership = new Map<string, Set<string>>();
  const ensureMember = (grupoId: string, janijId: string) => {
    let set = membership.get(grupoId);
    if (!set) {
      set = new Set<string>();
      membership.set(grupoId, set);
    }
    set.add(janijId);
  };

  const activeJanijIds = new Set<string>();
  const { data: janijRows, error: janijError } = await supabase
    .from("janijim")
    .select("id, grupo_id")
    .eq("activo", true)
    .in("grupo_id", groupIds);

  if (janijError) throw janijError;

  for (const row of janijRows ?? []) {
    const grupoId = row?.grupo_id as string | null;
    const janijId = row?.id as string | null;
    if (!grupoId || !janijId) {
      continue;
    }
    if (!groupSet.has(grupoId)) {
      continue;
    }
    activeJanijIds.add(janijId);
    ensureMember(grupoId, janijId);
  }

  const relationName = "janijim_grupos_extra";
  const { data: extrasRows, error: extrasError } = await supabase
    .from(relationName)
    .select("grupo_id, janij_id")
    .in("grupo_id", groupIds);

  const extrasMissing =
    extrasError && isMissingRelationError(extrasError, relationName);
  if (extrasError && !extrasMissing) {
    throw extrasError;
  }

  if (!extrasMissing) {
    const pendingIds = new Set<string>();
    for (const row of extrasRows ?? []) {
      const janijId = row?.janij_id as string | null;
      if (janijId && !activeJanijIds.has(janijId)) {
        pendingIds.add(janijId);
      }
    }

    let extraActiveIds = new Set<string>();
    if (pendingIds.size > 0) {
      const { data: extraActiveRows, error: extraActiveError } = await supabase
        .from("janijim")
        .select("id")
        .eq("activo", true)
        .in("id", Array.from(pendingIds));
      if (extraActiveError) throw extraActiveError;
      extraActiveIds = new Set(
        (extraActiveRows ?? [])
          .map((row) => row?.id as string | null)
          .filter((id): id is string => Boolean(id)),
      );
      for (const id of extraActiveIds) {
        activeJanijIds.add(id);
      }
    }

    for (const row of extrasRows ?? []) {
      const grupoId = row?.grupo_id as string | null;
      const janijId = row?.janij_id as string | null;
      if (!grupoId || !janijId) {
        continue;
      }
      if (!groupSet.has(grupoId)) {
        continue;
      }
      if (!activeJanijIds.has(janijId)) {
        continue;
      }
      ensureMember(grupoId, janijId);
    }
  } else {
    const { data: extrasCandidates, error: extrasCandidatesError } = await supabase
      .from("janijim")
      .select("id, extras")
      .eq("activo", true)
      .not("extras", "is", null);

    if (extrasCandidatesError) throw extrasCandidatesError;

    for (const row of extrasCandidates ?? []) {
      const janijId = row?.id as string | null;
      if (!janijId) {
        continue;
      }
      const extrasList = parseJanijExtras(
        (row?.extras as Record<string, unknown> | null) ?? null,
      );
      for (const extra of extrasList) {
        const grupoId = extra.id;
        if (!grupoId || !groupSet.has(grupoId)) {
          continue;
        }
        ensureMember(grupoId, janijId);
      }
    }
  }

  const result = new Map<string, number>();
  for (const grupoId of groupIds) {
    result.set(grupoId, membership.get(grupoId)?.size ?? 0);
  }
  return result;
}

async function fetchProyectoCoordinadores(proyectoId: string): Promise<GrupoCoordinadorInfo[]> {
  const { data: coordinadorLinks, error: coordinadorError } = await supabase
    .from("proyecto_coordinadores")
    .select("role_id")
    .eq("proyecto_id", proyectoId);

  if (coordinadorError) throw coordinadorError;

  const roleIds = (coordinadorLinks ?? [])
    .map((row) => row.role_id as string | null)
    .filter((id): id is string => Boolean(id));

  if (roleIds.length === 0) {
    return [];
  }

  const { data: roles, error: rolesError } = await supabase
    .from("app_roles")
    .select("nombre, email")
    .in("id", roleIds)
    .eq("activo", true);

  if (rolesError) throw rolesError;

  return (roles ?? [])
    .map<GrupoCoordinadorInfo>((row) => {
      const nombre = ((row?.nombre as string | null) ?? "").trim();
      const email = ((row?.email as string | null) ?? "").trim();
      return {
        nombre: nombre.length > 0 ? nombre : email,
        email,
      };
    })
    .filter((row) => row.nombre || row.email)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function mapMadrijRow(row: MadrijGrupoRow): GrupoMadrijInfo {
  const rawNombre =
    (row.madrij?.nombre as string | null) ??
    (row.nombre as string | null) ??
    "";
  const nombre = rawNombre.trim().length > 0 ? rawNombre.trim() : "Madrij sin nombre";
  const rawEmail =
    (row.madrij?.email as string | null) ??
    (row.email as string | null) ??
    null;
  const email = rawEmail && rawEmail.trim().length > 0 ? rawEmail.trim() : null;
  const id =
    (row.madrij?.clerk_id as string | null) ??
    (row.madrij_id as string | null) ??
    null;

  return {
    id,
    nombre,
    email,
    rol: (row.rol as string | null) ?? null,
    invitado: Boolean(row.invitado),
  };
}

export async function getGruposQuickStats(proyectoId: string, userId: string): Promise<GrupoQuickStats[]> {
  const grupos = await getGruposByProyecto(proyectoId, userId);
  if (grupos.length === 0) {
    return [];
  }

  const targetGroupIds = grupos.map((grupo) => grupo.id);

  const janijCounts = await countActiveJanijByGroup(targetGroupIds);

  const madCounts = new Map<string, number>();
  if (targetGroupIds.length > 0) {
    const { data: madRows, error: madError } = await supabase
      .from("madrijim_grupos")
      .select("grupo_id, madrij_id, email, nombre")
      .eq("activo", true)
      .in("grupo_id", targetGroupIds);

    if (madError) throw madError;

    for (const row of madRows ?? []) {
      const grupoId = row?.grupo_id as string | null;
      if (!grupoId) continue;
      madCounts.set(grupoId, (madCounts.get(grupoId) ?? 0) + 1);
    }
  }

  return grupos.map((grupo) => {
    return {
      id: grupo.id,
      nombre: grupo.nombre,
      totalJanijim: janijCounts.get(grupo.id) ?? 0,
      totalMadrijim: madCounts.get(grupo.id) ?? 0,
    };
  });
}

export async function getGrupoDetalle(
  proyectoId: string,
  grupoId: string,
  userId: string,
): Promise<GrupoDetalle> {
  const grupos = await getGruposByProyecto(proyectoId, userId);
  const target = grupos.find((grupo) => grupo.id === grupoId);

  if (!target) {
    throw new AccessDeniedError("No tenes acceso a este grupo");
  }

  const coordinadores = await fetchProyectoCoordinadores(proyectoId);
  const { data: grupoRow, error: grupoError } = await supabase
    .from("grupos")
    .select("id")
    .eq("id", grupoId)
    .maybeSingle();

  if (grupoError) throw grupoError;
  if (!grupoRow) {
    throw new AccessDeniedError("El grupo ya no existe");
  }

  const { data: madRows, error: madError } = await supabase
    .from("madrijim_grupos")
    .select("madrij_id, nombre, email, rol, invitado")
    .eq("grupo_id", grupoId)
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (madError) throw madError;

  const madrijim = ((madRows ?? []) as MadrijGrupoRow[])
    .map(mapMadrijRow)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const totalMadrijim = madrijim.length;

  const janijCounts = await countActiveJanijByGroup([grupoId]);
  const totalJanijim = janijCounts.get(grupoId) ?? 0;

  return {
    id: grupoId,
    nombre: target.nombre,
    totalJanijim,
    totalMadrijim,
    madrijim,
    coordinadores,
  };
}
