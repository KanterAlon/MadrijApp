import {
  loadSheetsData,
  normaliseEmail,
  normaliseGroupName,
  type JanijSheetEntry,
  type SheetsData,
} from "@/lib/google/sheetData";
import { supabase } from "@/lib/supabase";
import { isMissingRelationError } from "@/lib/supabase/errors";
import type { AppRole } from "@/lib/supabase/access";
import {
  dedupeJanijEntries,
  syncGroupFromSheets,
  type SyncResult,
} from "@/lib/sync/sheetsSync";
import { syncAppRolesFromSheets, type RolesSyncResult } from "@/lib/sync/rolesSync";

const normaliseProjectName = normaliseGroupName;

export type FieldChange<T> = {
  before: T | null;
  after: T | null;
};

export type JanijUpdatePreview = {
  id: string;
  nombreAnterior: string;
  nombreNuevo: string;
  cambios: {
    nombre?: FieldChange<string>;
    telMadre?: FieldChange<string>;
    telPadre?: FieldChange<string>;
    numeroSocio?: FieldChange<string>;
    otrosGrupos?: {
      agregar: string[];
      quitar: string[];
    };
  };
  reactivar: boolean;
};

export type JanijInsertPreview = {
  nombre: string;
  telMadre: string | null;
  telPadre: string | null;
  numeroSocio: string | null;
  otrosGrupos: string[];
};

export type JanijDeactivatePreview = {
  id: string;
  nombre: string;
};

export type GroupJanijPreview = {
  grupoKey: string;
  grupoId: string | null;
  grupoNombre: string;
  proyectoId: string | null;
  proyectoNombre: string | null;
  esGrupoNuevo: boolean;
  esProyectoNuevo: boolean;
  totalSheet: number;
  totalActualActivos: number;
  inserts: JanijInsertPreview[];
  updates: JanijUpdatePreview[];
  deactivations: JanijDeactivatePreview[];
};

export type OrphanGroupPreview = {
  grupoId: string;
  grupoNombre: string;
  proyectos: { id: string | null; nombre: string }[];
};

export type RoleEntryPreview = {
  email: string;
  nombre: string;
};

export type RoleDiffPreview = {
  role: AppRole;
  totalSheet: number;
  totalActivos: number;
  nuevos: RoleEntryPreview[];
  reactivar: RoleEntryPreview[];
  desactivar: RoleEntryPreview[];
};

export type CoordinatorProjectPreview = {
  email: string;
  nombre: string;
  proyectosSheet: string[];
  proyectosAsignados: string[];
  proyectosNuevos: string[];
  proyectosRemovidos: string[];
  proyectosInexistentes: string[];
};

export type SyncPreview = {
  generatedAt: string;
  resumen: {
    totalProyectosHoja: number;
    nuevosProyectos: string[];
    totalGruposHoja: number;
    nuevosGrupos: { grupo: string; proyecto: string | null }[];
    gruposOrfanos: number;
    janijim: {
      totalSheet: number;
      totalActivos: number;
      insertar: number;
      actualizar: number;
      desactivar: number;
      reactivar: number;
    };
    roles: {
      role: AppRole;
      hoja: number;
      activos: number;
      nuevos: number;
      reactivar: number;
      desactivar: number;
    }[];
  };
  grupos: {
    detalle: GroupJanijPreview[];
    orfanos: OrphanGroupPreview[];
  };
  roles: RoleDiffPreview[];
  coordinadores: CoordinatorProjectPreview[];
};

export type AdminSyncRunRow = {
  id: string;
  admin_id: string;
  status: "review" | "applied" | "cancelled";
  preview: SyncPreview;
  summary: SyncPreview["resumen"];
};

export type AdminSyncCommitResult = {
  grupos: {
    grupoNombre: string;
    proyectoNombre: string | null;
    inserted: number;
    updated: number;
    deactivated: number;
    madrijInserted: number;
    madrijUpdated: number;
    madrijDeactivated: number;
  }[];
  limpieza: {
    grupoId: string;
    grupoNombre: string;
    proyectos: string[];
    janijimDesactivados: number;
    madrijimDesactivados: number;
  }[];
  roles: RolesSyncResult;
};

function ensureNombre(nombre: string | null | undefined, fallback: string) {
  const trimmed = nombre?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

type ProyectoRow = { id: string; nombre: string | null; grupo_id: string | null };
type GrupoRow = { id: string; nombre: string | null };
type JanijRow = {
  id: string;
  nombre: string | null;
  grupo_id: string | null;
  proyecto_id: string | null;
  tel_madre: string | null;
  tel_padre: string | null;
  numero_socio: string | null;
  activo: boolean | null;
};
type RoleRow = {
  id: string;
  email: string | null;
  nombre: string | null;
  role: AppRole;
  activo: boolean | null;
};

function groupBy<T, K>(items: T[], getKey: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const current = map.get(key);
    if (current) {
      current.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

function uniqueRoleEntries(entries: RoleEntryPreview[]): RoleEntryPreview[] {
  const map = new Map<string, RoleEntryPreview>();
  for (const entry of entries) {
    const email = normaliseEmail(entry.email);
    if (!map.has(email)) {
      map.set(email, { email, nombre: entry.nombre });
    }
  }
  return Array.from(map.values());
}

function dedupeCoordinatorEntries(entries: { email: string; nombre: string; proyectos: string[] }[]) {
  const map = new Map<string, { email: string; nombre: string; proyectos: string[] }>();
  for (const entry of entries) {
    const email = normaliseEmail(entry.email);
    const proyectos = Array.from(new Set(entry.proyectos.map((p) => p.trim()).filter((p) => p.length > 0)));
    if (map.has(email)) {
      const existing = map.get(email)!;
      const combined = new Set([...existing.proyectos, ...proyectos]);
      existing.proyectos = Array.from(combined);
      existing.nombre = ensureNombre(entry.nombre, existing.email);
    } else {
      map.set(email, {
        email,
        nombre: ensureNombre(entry.nombre, entry.email),
        proyectos,
      });
    }
  }
  return Array.from(map.values());
}

function computeJanijDiff(
  existing: JanijRow[],
  entries: JanijSheetEntry[],
  extrasByJanijId: Map<string, { nombre: string; key: string }[]>,
): {
  inserts: JanijInsertPreview[];
  updates: JanijUpdatePreview[];
  deactivations: JanijDeactivatePreview[];
  reactivar: number;
} {
  const inserts: JanijInsertPreview[] = [];
  const updates: JanijUpdatePreview[] = [];
  const deactivations: JanijDeactivatePreview[] = [];
  let reactivar = 0;

  const existingMap = new Map<string, JanijRow>();
  for (const row of existing) {
    const nombre = row.nombre ? normaliseGroupName(row.nombre) : null;
    if (nombre) {
      existingMap.set(nombre, row);
    }
  }

  const seen = new Set<string>();
  const uniqueEntries = dedupeJanijEntries(entries);
  for (const entry of uniqueEntries) {
    const key = normaliseGroupName(entry.nombre);
    const existingRow = existingMap.get(key);
    if (!existingRow) {
      inserts.push({
        nombre: entry.nombre,
        telMadre: entry.telMadre ?? null,
        telPadre: entry.telPadre ?? null,
        numeroSocio: entry.numeroSocio ?? null,
        otrosGrupos: entry.otrosGrupos.map((extra) => extra.nombre),
      });
      continue;
    }
    seen.add(key);
    const cambios: JanijUpdatePreview["cambios"] = {};
    if ((existingRow.nombre ?? "") !== entry.nombre) {
      cambios.nombre = { before: existingRow.nombre ?? null, after: entry.nombre };
    }
    if ((existingRow.tel_madre ?? null) !== (entry.telMadre ?? null)) {
      cambios.telMadre = {
        before: existingRow.tel_madre ?? null,
        after: entry.telMadre ?? null,
      };
    }
    if ((existingRow.tel_padre ?? null) !== (entry.telPadre ?? null)) {
      cambios.telPadre = {
        before: existingRow.tel_padre ?? null,
        after: entry.telPadre ?? null,
      };
    }
    if ((existingRow.numero_socio ?? null) !== (entry.numeroSocio ?? null)) {
      cambios.numeroSocio = {
        before: existingRow.numero_socio ?? null,
        after: entry.numeroSocio ?? null,
      };
    }

    const existingExtras = extrasByJanijId.get(existingRow.id) ?? [];
    const existingExtraKeys = new Set(existingExtras.map((extra) => extra.key));
    const desiredExtras = entry.otrosGrupos;
    const desiredExtraKeys = new Set(desiredExtras.map((extra) => extra.key));
    const extrasAgregar = desiredExtras
      .filter((extra) => !existingExtraKeys.has(extra.key))
      .map((extra) => extra.nombre);
    const extrasQuitar = existingExtras
      .filter((extra) => !desiredExtraKeys.has(extra.key))
      .map((extra) => extra.nombre);
    if (extrasAgregar.length > 0 || extrasQuitar.length > 0) {
      cambios.otrosGrupos = {
        agregar: extrasAgregar,
        quitar: extrasQuitar,
      };
    }
    const reactivarRegistro = existingRow.activo === false || existingRow.activo === null;
    if (Object.keys(cambios).length > 0 || reactivarRegistro) {
      if (reactivarRegistro) {
        reactivar += 1;
      }
      updates.push({
        id: existingRow.id,
        nombreAnterior: existingRow.nombre ?? entry.nombre,
        nombreNuevo: entry.nombre,
        cambios,
        reactivar: reactivarRegistro,
      });
    }
  }

  for (const row of existing) {
    const key = row.nombre ? normaliseGroupName(row.nombre) : null;
    if (!key) continue;
    if (!seen.has(key) && row.activo !== false) {
      deactivations.push({ id: row.id, nombre: row.nombre ?? "" });
    }
  }

  return { inserts, updates, deactivations, reactivar };
}

function buildRoleDiff(role: AppRole, entries: RoleEntryPreview[], existing: RoleRow[]): RoleDiffPreview {
  const desired = new Map(entries.map((entry) => [normaliseEmail(entry.email), entry] as const));
  const existingMap = new Map(existing.map((row) => [normaliseEmail(row.email ?? ""), row] as const));

  const nuevos: RoleEntryPreview[] = [];
  const reactivar: RoleEntryPreview[] = [];
  const desactivar: RoleEntryPreview[] = [];

  for (const [email, entry] of desired.entries()) {
    const current = existingMap.get(email);
    if (!current) {
      nuevos.push(entry);
      continue;
    }
    if (!current.activo) {
      reactivar.push({ email: entry.email, nombre: ensureNombre(entry.nombre, entry.email) });
    }
  }

  for (const [email, row] of existingMap.entries()) {
    if (!desired.has(email)) {
      desactivar.push({
        email: row.email ?? "",
        nombre: ensureNombre(row.nombre ?? null, row.email ?? email),
      });
    }
  }

  return {
    role,
    totalSheet: entries.length,
    totalActivos: existing.filter((row) => row.activo).length,
    nuevos,
    reactivar,
    desactivar,
  };
}

function buildCoordinatorPreview(
  entries: { email: string; nombre: string; proyectos: string[] }[],
  existingRoles: RoleRow[],
  proyectos: ProyectoRow[],
  coordinatorLinks: { role_id: string; proyecto_id: string }[],
): CoordinatorProjectPreview[] {
  if (entries.length === 0) {
    return [];
  }

  const roleIdByEmail = new Map<string, string>();
  for (const row of existingRoles) {
    const email = row.email ? normaliseEmail(row.email) : null;
    if (email) {
      roleIdByEmail.set(email, row.id);
    }
  }

  const proyectoById = new Map<string, ProyectoRow>();
  const proyectoByKey = new Map<string, ProyectoRow>();
  for (const proyecto of proyectos) {
    proyectoById.set(proyecto.id, proyecto);
    if (proyecto.nombre) {
      proyectoByKey.set(normaliseProjectName(proyecto.nombre), proyecto);
    }
  }

  const linksByRole = groupBy(coordinatorLinks, (row) => row.role_id);

  const previews: CoordinatorProjectPreview[] = [];

  for (const entry of entries) {
    const email = normaliseEmail(entry.email);
    const roleId = roleIdByEmail.get(email);
    const desired = new Set(entry.proyectos.map((nombre) => nombre.trim()).filter((nombre) => nombre.length > 0));
    const proyectosSheet = Array.from(desired);

    const existingAssignments = roleId ? linksByRole.get(roleId) ?? [] : [];
    const existingNames = existingAssignments
      .map((link) => proyectoById.get(link.proyecto_id)?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre));

    const proyectosNuevos: string[] = [];
    const proyectosRemovidos: string[] = [];
    const proyectosInexistentes: string[] = [];

    if (roleId) {
      const desiredIds = new Set(
        proyectosSheet
          .map((nombre) => proyectoByKey.get(normaliseProjectName(nombre))?.id)
          .filter((id): id is string => Boolean(id)),
      );

      const existingIds = new Set(existingAssignments.map((link) => link.proyecto_id));

      for (const nombre of proyectosSheet) {
        const proyecto = proyectoByKey.get(normaliseProjectName(nombre));
        if (!proyecto) {
          proyectosInexistentes.push(nombre);
          continue;
        }
        if (!existingIds.has(proyecto.id)) {
          proyectosNuevos.push(proyecto.nombre ?? nombre);
        }
      }

      for (const link of existingAssignments) {
        if (!desiredIds.has(link.proyecto_id)) {
          const nombre = proyectoById.get(link.proyecto_id)?.nombre;
          if (nombre) {
            proyectosRemovidos.push(nombre);
          }
        }
      }
    } else {
      const missingProjects = proyectosSheet.filter(
        (nombre) => !proyectoByKey.has(normaliseProjectName(nombre)),
      );
      proyectosInexistentes.push(...missingProjects);
      for (const nombre of proyectosSheet) {
        if (!missingProjects.includes(nombre)) {
          const proyecto = proyectoByKey.get(normaliseProjectName(nombre));
          proyectosNuevos.push(proyecto?.nombre ?? nombre);
        }
      }
    }

    previews.push({
      email,
      nombre: ensureNombre(entry.nombre, email),
      proyectosSheet,
      proyectosAsignados: existingNames,
      proyectosNuevos,
      proyectosRemovidos,
      proyectosInexistentes,
    });
  }

  return previews;
}

function buildSummary(
  detalle: GroupJanijPreview[],
  nuevosProyectos: string[],
  nuevosGrupos: { grupo: string; proyecto: string | null }[],
  roleDiffs: RoleDiffPreview[],
  orphanCount: number,
) {
  let totalSheet = 0;
  let totalActivos = 0;
  let insertar = 0;
  let actualizar = 0;
  let desactivar = 0;
  let reactivar = 0;

  for (const grupo of detalle) {
    totalSheet += grupo.totalSheet;
    totalActivos += grupo.totalActualActivos;
    insertar += grupo.inserts.length;
    actualizar += grupo.updates.length;
    desactivar += grupo.deactivations.length;
    reactivar += grupo.updates.filter((update) => update.reactivar).length;
  }

  return {
    totalProyectosHoja: nuevosProyectos.length + roleDiffs.length, // placeholder, replaced later
    nuevosProyectos,
    totalGruposHoja: detalle.length,
    nuevosGrupos,
    gruposOrfanos: orphanCount,
    janijim: {
      totalSheet,
      totalActivos,
      insertar,
      actualizar,
      desactivar,
      reactivar,
    },
    roles: roleDiffs.map((diff) => ({
      role: diff.role,
      hoja: diff.totalSheet,
      activos: diff.totalActivos,
      nuevos: diff.nuevos.length,
      reactivar: diff.reactivar.length,
      desactivar: diff.desactivar.length,
    })),
  } satisfies SyncPreview["resumen"];
}

export async function buildSyncPreview(options?: { data?: SheetsData }): Promise<SyncPreview> {
  const sheets = options?.data ?? (await loadSheetsData());

  const [proyectosRes, gruposRes, janijimRes, rolesRes, coordinatorLinksRes, grupoLinksRes, janijExtrasRes] =
    await Promise.all([
      supabase.from("proyectos").select("id, nombre, grupo_id"),
      supabase.from("grupos").select("id, nombre"),
      supabase
        .from("janijim")
        .select("id, nombre, grupo_id, proyecto_id, tel_madre, tel_padre, numero_socio, activo"),
      supabase.from("app_roles").select("id, email, nombre, role, activo"),
      supabase.from("proyecto_coordinadores").select("role_id, proyecto_id"),
      supabase.from("proyecto_grupos").select("proyecto_id, grupo_id"),
      supabase.from("janijim_grupos_extra").select("janij_id, grupo_id"),
    ]);

  if (proyectosRes.error) throw proyectosRes.error;
  if (gruposRes.error) throw gruposRes.error;
  if (janijimRes.error) throw janijimRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (coordinatorLinksRes.error) throw coordinatorLinksRes.error;
  if (grupoLinksRes.error) throw grupoLinksRes.error;
  const extrasRelation = "janijim_grupos_extra";
  if (janijExtrasRes.error && !isMissingRelationError(janijExtrasRes.error, extrasRelation)) {
    throw janijExtrasRes.error;
  }

  const proyectos = (proyectosRes.data ?? []) as ProyectoRow[];
  const grupos = (gruposRes.data ?? []) as GrupoRow[];
  const janijRows = (janijimRes.data ?? []) as JanijRow[];
  const roleRows = (rolesRes.data ?? []) as RoleRow[];
  const coordinatorLinks = coordinatorLinksRes.data ?? [];
  const proyectoGrupoLinks = grupoLinksRes.data ?? [];
  const extrasMissing = Boolean(
    janijExtrasRes.error && isMissingRelationError(janijExtrasRes.error, extrasRelation),
  );
  const janijExtraRows = extrasMissing
    ? []
    : ((janijExtrasRes.data ?? []) as { janij_id: string | null; grupo_id: string | null }[]);

  const proyectoByKey = new Map<string, ProyectoRow>();
  const proyectoById = new Map<string, ProyectoRow>();
  for (const proyecto of proyectos) {
    proyectoById.set(proyecto.id, proyecto);
    if (proyecto.nombre) {
      proyectoByKey.set(normaliseProjectName(proyecto.nombre), proyecto);
    }
  }

  const grupoByKey = new Map<string, GrupoRow>();
  const grupoById = new Map<string, GrupoRow>();
  for (const grupo of grupos) {
    if (!grupo.nombre) continue;
    const key = normaliseGroupName(grupo.nombre);
    grupoByKey.set(key, grupo);
    grupoById.set(grupo.id, grupo);
  }

  const extrasByJanijId = new Map<string, { nombre: string; key: string }[]>();
  for (const extra of janijExtraRows) {
    const janijId = extra.janij_id ?? null;
    const grupoId = extra.grupo_id ?? null;
    if (!janijId || !grupoId) continue;
    const grupo = grupoById.get(grupoId);
    const nombre = grupo?.nombre ?? grupoId;
    const key = grupo?.nombre ? normaliseGroupName(grupo.nombre) : grupoId;
    const list = extrasByJanijId.get(janijId) ?? [];
    list.push({ nombre, key });
    extrasByJanijId.set(janijId, list);
  }

  const sheetGroups = new Map<
    string,
    {
      nombre: string;
      proyectoNombre: string | null;
      proyectoKey: string | null;
    }
  >();

  for (const proyecto of sheets.proyectos) {
    const projectName = proyecto.nombre.trim();
    if (!projectName) {
      continue;
    }
    const projectKey = normaliseProjectName(projectName);
    for (const grupoNombre of proyecto.grupos) {
      const trimmed = grupoNombre.trim();
      if (!trimmed) continue;
      const key = normaliseGroupName(trimmed);
      if (!sheetGroups.has(key)) {
        sheetGroups.set(key, {
          nombre: trimmed,
          proyectoNombre: projectName || null,
          proyectoKey: projectName ? projectKey : null,
        });
      } else {
        const existing = sheetGroups.get(key)!;
        if (!existing.proyectoNombre && projectName) {
          existing.proyectoNombre = projectName;
          existing.proyectoKey = projectKey;
        }
      }
    }
  }

  for (const entry of sheets.madrijes) {
    const key = entry.grupoKey;
    if (!sheetGroups.has(key)) {
      sheetGroups.set(key, {
        nombre: entry.grupoNombre,
        proyectoNombre: null,
        proyectoKey: null,
      });
    }
  }

  for (const entry of sheets.janijim) {
    const key = entry.grupoPrincipalKey;
    if (!sheetGroups.has(key)) {
      sheetGroups.set(key, {
        nombre: entry.grupoPrincipalNombre,
        proyectoNombre: null,
        proyectoKey: null,
      });
    }
  }

  const sheetJanijByGroup = groupBy(sheets.janijim, (entry) => entry.grupoPrincipalKey);
  const janijByGrupoId = groupBy(
    janijRows,
    (row) => row.grupo_id ?? "",
  );
  const proyectoByGrupoId = new Map<string, ProyectoRow[]>();
  for (const link of proyectoGrupoLinks ?? []) {
    if (!link.grupo_id) continue;
    const list = proyectoByGrupoId.get(link.grupo_id) ?? [];
    const proyecto = link.proyecto_id ? proyectoById.get(link.proyecto_id) : undefined;
    if (proyecto) {
      list.push(proyecto);
      proyectoByGrupoId.set(link.grupo_id, list);
    }
  }

  for (const proyecto of proyectos) {
    if (proyecto.grupo_id) {
      const list = proyectoByGrupoId.get(proyecto.grupo_id) ?? [];
      if (!list.includes(proyecto)) {
        list.push(proyecto);
        proyectoByGrupoId.set(proyecto.grupo_id, list);
      }
    }
  }

  const detalle: GroupJanijPreview[] = [];
  const nuevosProyectos: string[] = [];
  const nuevosGrupos: { grupo: string; proyecto: string | null }[] = [];

  const sortedSheetGroups = Array.from(sheetGroups.entries()).sort((a, b) => {
    const projectA = a[1].proyectoNombre ?? "";
    const projectB = b[1].proyectoNombre ?? "";
    const projectCompare = projectA.localeCompare(projectB);
    if (projectCompare !== 0) return projectCompare;
    return a[1].nombre.localeCompare(b[1].nombre);
  });

  for (const [key, info] of sortedSheetGroups) {
    const grupo = grupoByKey.get(key) ?? null;
    const proyecto = info.proyectoKey ? proyectoByKey.get(info.proyectoKey) ?? null : null;
    if (info.proyectoKey && proyecto == null) {
      nuevosProyectos.push(info.proyectoNombre ?? info.proyectoKey);
    }
    if (!grupo) {
      nuevosGrupos.push({ grupo: info.nombre, proyecto: info.proyectoNombre ?? null });
    }
    const existingJanij = grupo ? janijByGrupoId.get(grupo.id) ?? [] : [];
    const sheetEntries = sheetJanijByGroup.get(key) ?? [];
    const diff = computeJanijDiff(existingJanij, sheetEntries, extrasByJanijId);
    detalle.push({
      grupoKey: key,
      grupoId: grupo?.id ?? null,
      grupoNombre: info.nombre,
      proyectoId: proyecto?.id ?? null,
      proyectoNombre: info.proyectoNombre ?? proyecto?.nombre ?? null,
      esGrupoNuevo: !grupo,
      esProyectoNuevo: info.proyectoKey ? !proyecto : false,
      totalSheet: sheetEntries.length,
      totalActualActivos: existingJanij.filter((row) => row.activo !== false).length,
      inserts: diff.inserts,
      updates: diff.updates,
      deactivations: diff.deactivations,
    });
  }

  const orphanGroups: OrphanGroupPreview[] = [];
  for (const grupo of grupos) {
    if (!grupo.nombre) continue;
    const key = normaliseGroupName(grupo.nombre);
    if (sheetGroups.has(key)) continue;
    const proyectos = proyectoByGrupoId.get(grupo.id) ?? [];
    orphanGroups.push({
      grupoId: grupo.id,
      grupoNombre: grupo.nombre,
      proyectos: proyectos.map((proyecto) => ({
        id: proyecto.id,
        nombre: proyecto.nombre ?? "",
      })),
    });
  }

  const uniqueMadrijEntries = uniqueRoleEntries(
    sheets.madrijes.map((entry) => ({ email: entry.email, nombre: entry.nombre })),
  );
  const uniqueCoordEntries = dedupeCoordinatorEntries(sheets.coordinadores);
  const uniqueDirectorEntries = uniqueRoleEntries(sheets.directores);
  const uniqueAdminEntries = uniqueRoleEntries(sheets.admins);

  const roleDiffs: RoleDiffPreview[] = [
    buildRoleDiff(
      "madrij",
      uniqueMadrijEntries,
      roleRows.filter((row) => row.role === "madrij"),
    ),
    buildRoleDiff(
      "coordinador",
      uniqueCoordEntries.map((entry) => ({ email: entry.email, nombre: entry.nombre })),
      roleRows.filter((row) => row.role === "coordinador"),
    ),
    buildRoleDiff(
      "director",
      uniqueDirectorEntries,
      roleRows.filter((row) => row.role === "director"),
    ),
    buildRoleDiff(
      "admin",
      uniqueAdminEntries,
      roleRows.filter((row) => row.role === "admin"),
    ),
  ];

  const coordinatorPreview = buildCoordinatorPreview(
    uniqueCoordEntries,
    roleRows.filter((row) => row.role === "coordinador"),
    proyectos,
    coordinatorLinks,
  );

  const resumen = buildSummary(
    detalle,
    Array.from(new Set(nuevosProyectos)),
    nuevosGrupos,
    roleDiffs,
    orphanGroups.length,
  );
  resumen.totalProyectosHoja = sheets.proyectos.length;

  return {
    generatedAt: new Date().toISOString(),
    resumen,
    grupos: {
      detalle,
      orfanos: orphanGroups,
    },
    roles: roleDiffs,
    coordinadores: coordinatorPreview,
  } satisfies SyncPreview;
}

function summarizeGroupResult(
  preview: GroupJanijPreview,
  result: SyncResult,
): AdminSyncCommitResult["grupos"][number] {
  return {
    grupoNombre: preview.grupoNombre,
    proyectoNombre: preview.proyectoNombre ?? null,
    inserted: result.janijim.inserted,
    updated: result.janijim.updated,
    deactivated: result.janijim.deactivated,
    madrijInserted: result.madrijim.inserted,
    madrijUpdated: result.madrijim.updated,
    madrijDeactivated: result.madrijim.deactivated,
  };
}

async function deactivateGroup(grupoId: string, grupoNombre: string, proyectos: string[]): Promise<{
  grupoId: string;
  grupoNombre: string;
  proyectos: string[];
  janijimDesactivados: number;
  madrijimDesactivados: number;
}> {
  const [{ data: janijActivos }, { data: madActivos }] = await Promise.all([
    supabase
      .from("janijim")
      .select("id")
      .eq("grupo_id", grupoId)
      .eq("activo", true),
    supabase
      .from("madrijim_grupos")
      .select("id")
      .eq("grupo_id", grupoId)
      .eq("activo", true),
  ]);

  const janijIds = (janijActivos ?? []).map((row) => row.id as string);
  const madIds = (madActivos ?? []).map((row) => row.id as string);

  if (janijIds.length > 0) {
    const { error: janijError } = await supabase
      .from("janijim")
      .update({ activo: false })
      .in("id", janijIds);
    if (janijError) throw janijError;
  }

  if (madIds.length > 0) {
    const { error: madError } = await supabase
      .from("madrijim_grupos")
      .update({ activo: false })
      .in("id", madIds);
    if (madError) throw madError;
  }

  return {
    grupoId,
    grupoNombre,
    proyectos,
    janijimDesactivados: janijIds.length,
    madrijimDesactivados: madIds.length,
  };
}

async function applyPreviewWithSheets(
  preview: SyncPreview,
  sheetsData: SheetsData,
): Promise<AdminSyncCommitResult> {
  const processedGroups: AdminSyncCommitResult["grupos"] = [];

  for (const grupo of preview.grupos.detalle) {
    const result = await syncGroupFromSheets(grupo.grupoNombre, {
      expectedGrupoId: grupo.grupoId ?? undefined,
      data: sheetsData,
    });
    processedGroups.push(summarizeGroupResult(grupo, result));
  }

  const cleanupResults: AdminSyncCommitResult["limpieza"] = [];
  for (const orphan of preview.grupos.orfanos) {
    const proyectos = orphan.proyectos.map((p) => p.nombre).filter((nombre) => nombre.length > 0);
    const cleanup = await deactivateGroup(orphan.grupoId, orphan.grupoNombre, proyectos);
    cleanupResults.push(cleanup);
  }

  const rolesResult = await syncAppRolesFromSheets(sheetsData);


  return {
    grupos: processedGroups,
    limpieza: cleanupResults,
    roles: rolesResult,
  };
}

export async function createAdminSyncRun(adminId: string) {
  const preview = await buildSyncPreview();

  await supabase
    .from("admin_sync_runs")
    .update({ status: "cancelled", last_error: "Reemplazado por una nueva vista previa" })
    .eq("admin_id", adminId)
    .eq("status", "review");

  const { data, error } = await supabase
    .from("admin_sync_runs")
    .insert({
      admin_id: adminId,
      status: "review",
      preview,
      summary: preview.resumen,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("No se pudo registrar la vista previa");
  }

  return { runId: data.id as string, preview };
}

export async function commitAdminSyncRun(runId: string, adminId: string) {
  const { data: run, error } = await supabase
    .from("admin_sync_runs")
    .select("id, admin_id, status, preview, summary")
    .eq("id", runId)
    .maybeSingle();

  if (error) throw error;
  if (!run) throw new Error("Vista previa no encontrada");
  if (run.admin_id !== adminId) {
    throw new Error("Solo el administrador que generÃ³ la vista previa puede confirmarla");
  }
  if (run.status !== "review") {
    throw new Error("Esta vista previa ya fue procesada");
  }

  const preview = run.preview as SyncPreview;

  const sheetsData = await loadSheetsData();
  const commitResult = await applyPreviewWithSheets(preview, sheetsData);

  const { error: updateError } = await supabase
    .from("admin_sync_runs")
    .update({
      status: "applied",
      committed_at: new Date().toISOString(),
      result: commitResult,
      last_error: null,
    })
    .eq("id", runId);

  if (updateError) throw updateError;

  return { preview, result: commitResult };
}

export async function applySheetsDataDirectly(data: SheetsData) {
  const preview = await buildSyncPreview({ data });
  const result = await applyPreviewWithSheets(preview, data);
  return { preview, result };
}

