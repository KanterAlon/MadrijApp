import { supabase } from "@/lib/supabase";
import { AccessDeniedError, ensureProyectoAccess } from "@/lib/supabase/access";

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
  isGeneral: boolean;
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
  isGeneral: boolean;
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
  const { grupoIds, appliesToAll } = await ensureProyectoAccess(userId, proyectoId);
  if (appliesToAll) {
    return [
      {
        id: `general:${proyectoId}`,
        nombre: "Todos los janijim",
        spreadsheet_id: null,
        janij_sheet: null,
        madrij_sheet: null,
      },
    ];
  }
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
  // For projects flagged as general we need the complete universe of groups,
  // because the admin sheet lists the project once with applies_to_all=true.
  const { data: proyectoRow, error: proyectoError } = await supabase
    .from("proyectos")
    .select("applies_to_all, grupo_id")
    .eq("id", proyectoId)
    .maybeSingle();

  if (proyectoError) throw proyectoError;

  if (!proyectoRow) {
    return [];
  }

  if (Boolean(proyectoRow.applies_to_all)) {
    const { data: allGroups, error: allGroupsError } = await supabase.from("grupos").select("id");

    if (allGroupsError) throw allGroupsError;

    return (allGroups ?? [])
      .map((row) => row?.id as string | null)
      .filter((id): id is string => Boolean(id));
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

  let targetGroupIds = grupos
    .filter((grupo) => !grupo.id.startsWith("general:"))
    .map((grupo) => grupo.id);

  const hasGeneralEntry = grupos.some((grupo) => grupo.id.startsWith("general:"));
  if (targetGroupIds.length === 0 && hasGeneralEntry) {
    targetGroupIds = await listProjectGroupIds(proyectoId);
  }

  const janijCounts = new Map<string, number>();
  if (targetGroupIds.length > 0) {
    const { data: janijRows, error: janijError } = await supabase
      .from("janijim")
      .select("grupo_id")
      .eq("activo", true)
      .in("grupo_id", targetGroupIds);

    if (janijError) throw janijError;

    for (const row of janijRows ?? []) {
      const grupoId = row?.grupo_id as string | null;
      if (!grupoId) continue;
      janijCounts.set(grupoId, (janijCounts.get(grupoId) ?? 0) + 1);
    }
  }

  const madCounts = new Map<string, number>();
  const projectMadKeys = new Set<string>();
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

      const key =
        (row?.madrij_id as string | null) ??
        ((row?.email as string | null)?.trim() || null) ??
        ((row?.nombre as string | null)?.trim() || null);

      if (key) {
        projectMadKeys.add(key);
      }
    }
  }

  const totalJanijAcrossGroups = Array.from(janijCounts.values()).reduce((sum, value) => sum + value, 0);

  let globalJanijCount: number | null = null;
  if (hasGeneralEntry) {
    const { count: janijGlobalCount, error: janijGlobalError } = await supabase
      .from("janijim")
      .select("id", { count: "exact", head: true })
      .eq("activo", true);

    if (janijGlobalError) throw janijGlobalError;
    globalJanijCount = janijGlobalCount ?? 0;
  }

  const generalJanijTotal = globalJanijCount ?? totalJanijAcrossGroups;
  const totalMadProyecto = projectMadKeys.size;

  return grupos.map((grupo) => {
    const isGeneral = grupo.id.startsWith("general:");
    return {
      id: grupo.id,
      nombre: grupo.nombre,
      isGeneral,
      totalJanijim: isGeneral ? generalJanijTotal : janijCounts.get(grupo.id) ?? 0,
      totalMadrijim: isGeneral ? totalMadProyecto : madCounts.get(grupo.id) ?? 0,
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

  const isGeneral = grupoId.startsWith("general:");
  let totalJanijim = 0;
  let totalMadrijim = 0;
  let madrijim: GrupoMadrijInfo[] = [];

  if (isGeneral) {
    const groupIds = await listProjectGroupIds(proyectoId);

    if (groupIds.length > 0) {
      const { data: madRows, error: madError } = await supabase
        .from("madrijim_grupos")
        .select("grupo_id, madrij_id, nombre, email, rol, invitado")
        .eq("activo", true)
        .in("grupo_id", groupIds);

      if (madError) throw madError;

      const unique = new Map<string, GrupoMadrijInfo>();
      for (const row of (madRows ?? []) as MadrijGrupoRow[]) {
        const info = mapMadrijRow(row);
        const key =
          info.id ??
          info.email ??
          (info.nombre ? `${info.nombre}-${row.grupo_id ?? ""}` : null);
        if (!key || unique.has(key)) continue;
        unique.set(key, info);
      }

      madrijim = Array.from(unique.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
      totalMadrijim = madrijim.length;
    } else {
      madrijim = [];
      totalMadrijim = 0;
    }

    const { count: janijCount, error: janijError } = await supabase
      .from("janijim")
      .select("id", { count: "exact", head: true })
      .eq("activo", true);

    if (janijError) throw janijError;
    totalJanijim = janijCount ?? 0;
  } else {
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

    madrijim = ((madRows ?? []) as MadrijGrupoRow[])
      .map(mapMadrijRow)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    totalMadrijim = madrijim.length;

    const { count: janijCount, error: janijError } = await supabase
      .from("janijim")
      .select("id", { count: "exact", head: true })
      .eq("activo", true)
      .eq("grupo_id", grupoId);

    if (janijError) throw janijError;
    totalJanijim = janijCount ?? 0;
  }

  return {
    id: grupoId,
    nombre: target.nombre,
    isGeneral,
    totalJanijim,
    totalMadrijim,
    madrijim,
    coordinadores,
  };
}
