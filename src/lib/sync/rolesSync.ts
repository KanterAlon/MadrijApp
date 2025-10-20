import { normaliseGroupName, type SheetsData } from "@/lib/google/sheetData";
import { supabase } from "@/lib/supabase";

type AppRole = "madrij" | "coordinador" | "director" | "admin";

type RoleEntry = {
  email: string;
  nombre: string;
};

type CoordinatorEntry = RoleEntry & {
  proyectos: string[];
};

type RoleSyncStats = {
  upserted: number;
  deactivated: number;
};

type CoordinatorSyncStats = {
  upserted: number;
  removed: number;
  missingProjects: string[];
};

export type RolesSyncResult = {
  roles: Record<AppRole, RoleSyncStats>;
  coordinadoresProyectos: CoordinatorSyncStats;
};

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

const normaliseProjectName = normaliseGroupName;

async function syncRoleEntries(role: AppRole, entries: RoleEntry[]): Promise<RoleSyncStats> {
  const emails = entries.map((entry) => normaliseEmail(entry.email));

  const { data: existingAll, error: existingError } = await supabase
    .from("app_roles")
    .select("id, email, activo")
    .eq("role", role);

  if (existingError) throw existingError;

  const upserts = entries.map((entry) => ({
    email: normaliseEmail(entry.email),
    role,
    nombre: entry.nombre.trim() || entry.email,
    activo: true,
  }));

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from("app_roles")
      .upsert(upserts, { onConflict: "email,role" });
    if (upsertError) throw upsertError;
  }

  const existingEmails = new Set(emails);
  const toDeactivate = (existingAll ?? []).filter((row) => !existingEmails.has(normaliseEmail(row.email)));

  if (toDeactivate.length > 0) {
    const { error: deactivateError } = await supabase
      .from("app_roles")
      .update({ activo: false })
      .in(
        "id",
        toDeactivate.map((row) => row.id as string),
      );
    if (deactivateError) throw deactivateError;
  }

  return {
    upserted: upserts.length,
    deactivated: toDeactivate.length,
  };
}

async function syncCoordinadorProyectos(entries: CoordinatorEntry[]): Promise<CoordinatorSyncStats> {
  if (entries.length === 0) {
    const { data: existingLinks, error: fetchError } = await supabase
      .from("proyecto_coordinadores")
      .select("id");
    if (fetchError) throw fetchError;
    if ((existingLinks ?? []).length > 0) {
      const { error: deleteError } = await supabase
        .from("proyecto_coordinadores")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (deleteError) throw deleteError;
      return { upserted: 0, removed: existingLinks.length, missingProjects: [] };
    }
    return { upserted: 0, removed: 0, missingProjects: [] };
  }

  const normalisedEmails = entries.map((entry) => normaliseEmail(entry.email));

  const { data: roleRows, error: roleError } = await supabase
    .from("app_roles")
    .select("id, email")
    .eq("role", "coordinador")
    .eq("activo", true)
    .in("email", normalisedEmails);

  if (roleError) throw roleError;

  const roleIdByEmail = new Map<string, string>();
  for (const row of roleRows ?? []) {
    roleIdByEmail.set(normaliseEmail(row.email as string), row.id as string);
  }

  const { data: proyectos, error: proyectosError } = await supabase
    .from("proyectos")
    .select("id, nombre");

  if (proyectosError) throw proyectosError;

  const proyectoIdByNombre = new Map<string, string>();
  for (const proyecto of proyectos ?? []) {
    if (!proyecto?.nombre) continue;
    proyectoIdByNombre.set(normaliseProjectName(proyecto.nombre as string), proyecto.id as string);
  }

  const desiredPairs: { roleId: string; proyectoId: string }[] = [];
  const missingProjects = new Set<string>();

  for (const entry of entries) {
    const roleId = roleIdByEmail.get(normaliseEmail(entry.email));
    if (!roleId) continue;
    for (const proyectoNombre of entry.proyectos) {
      const normalised = normaliseProjectName(proyectoNombre);
      const proyectoId = proyectoIdByNombre.get(normalised);
      if (!proyectoId) {
        missingProjects.add(proyectoNombre);
        continue;
      }
      desiredPairs.push({ roleId, proyectoId });
    }
  }

  const uniqueRoleIds = Array.from(new Set(desiredPairs.map((pair) => pair.roleId)));

  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("proyecto_coordinadores")
    .select("id, role_id, proyecto_id")
    .in("role_id", uniqueRoleIds);

  if (existingLinksError) throw existingLinksError;

  const existingSet = new Set(
    (existingLinks ?? []).map((row) => `${row.role_id as string}:${row.proyecto_id as string}`),
  );
  const desiredSet = new Set(desiredPairs.map((pair) => `${pair.roleId}:${pair.proyectoId}`));

  const inserts = desiredPairs.filter((pair) => !existingSet.has(`${pair.roleId}:${pair.proyectoId}`));
  const removals = (existingLinks ?? []).filter((row) => !desiredSet.has(`${row.role_id}:${row.proyecto_id}`));

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from("proyecto_coordinadores").insert(
      inserts.map((pair) => ({
        role_id: pair.roleId,
        proyecto_id: pair.proyectoId,
      })),
    );
    if (insertError) throw insertError;
  }

  if (removals.length > 0) {
    const { error: removeError } = await supabase
      .from("proyecto_coordinadores")
      .delete()
      .in(
        "id",
        removals.map((row) => row.id as string),
      );
    if (removeError) throw removeError;
  }

  return {
    upserted: inserts.length,
    removed: removals.length,
    missingProjects: Array.from(missingProjects),
  };
}

export async function syncAppRolesFromSheets(data: SheetsData): Promise<RolesSyncResult> {
  const madEntries: RoleEntry[] = data.madrijes.map((entry) => ({
    email: entry.email,
    nombre: entry.nombre,
  }));
  const coordEntries: CoordinatorEntry[] = data.coordinadores.map((entry) => ({
    email: entry.email,
    nombre: entry.nombre,
    proyectos: entry.proyectos,
  }));
  const directorEntries: RoleEntry[] = data.directores.map((entry) => ({
    email: entry.email,
    nombre: entry.nombre,
  }));
  const adminEntries: RoleEntry[] = data.admins.map((entry) => ({
    email: entry.email,
    nombre: entry.nombre,
  }));

  const results: RolesSyncResult = {
    roles: {
      madrij: await syncRoleEntries("madrij", madEntries),
      coordinador: await syncRoleEntries("coordinador", coordEntries),
      director: await syncRoleEntries("director", directorEntries),
      admin: await syncRoleEntries("admin", adminEntries),
    },
    coordinadoresProyectos: await syncCoordinadorProyectos(coordEntries),
  };

  return results;
}
