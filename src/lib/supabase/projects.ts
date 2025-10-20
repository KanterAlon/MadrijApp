import { supabase } from "@/lib/supabase";

type RawProyecto = {
  id: string;
  nombre: string;
  creador_id: string;
};

export async function getProyectosParaUsuario(userId: string) {
  const { data: roleRows, error: roleError } = await supabase
    .from("app_roles")
    .select("id, role")
    .eq("clerk_id", userId)
    .eq("activo", true);

  if (roleError) throw roleError;

  const roles = roleRows ?? [];
  const coordinatorRoleIds = roles.filter((row) => row.role === "coordinador").map((row) => row.id as string);
  const isDirector = roles.some((row) => row.role === "director");
  const isAdmin = roles.some((row) => row.role === "admin");

  if (isDirector || isAdmin) {
    const { data: allProjects, error: allProjectsError } = await supabase
      .from("proyectos")
      .select("id, nombre, creador_id");
    if (allProjectsError) throw allProjectsError;
    return (allProjects ?? []) as RawProyecto[];
  }

  const proyectoIds = new Set<string>();

  const { data: madrijGrupos, error: madrijError } = await supabase
    .from("madrijim_grupos")
    .select("grupo_id")
    .eq("madrij_id", userId)
    .eq("invitado", false)
    .eq("activo", true);
  if (madrijError) throw madrijError;

  const grupoIds = (madrijGrupos ?? []).map((row) => row.grupo_id as string);
  if (grupoIds.length > 0) {
    const { data: proyectoGrupoRows, error: proyectoGrupoError } = await supabase
      .from("proyecto_grupos")
      .select("proyecto_id")
      .in("grupo_id", grupoIds);
    if (proyectoGrupoError) throw proyectoGrupoError;
    for (const row of proyectoGrupoRows ?? []) {
      proyectoIds.add(row.proyecto_id as string);
    }
  }

  if (coordinatorRoleIds.length > 0) {
    const { data: coordRows, error: coordError } = await supabase
      .from("proyecto_coordinadores")
      .select("proyecto_id")
      .in("role_id", coordinatorRoleIds);
    if (coordError) throw coordError;
    for (const row of coordRows ?? []) {
      proyectoIds.add(row.proyecto_id as string);
    }
  }

  if (proyectoIds.size === 0) {
    return [];
  }

  const { data: proyectos, error: proyectosError } = await supabase
    .from("proyectos")
    .select("id, nombre, creador_id")
    .in("id", Array.from(proyectoIds));
  if (proyectosError) throw proyectosError;

  return (proyectos ?? []) as RawProyecto[];
}

export async function getGrupoIdsForProyecto(proyectoId: string) {
  const { data, error } = await supabase
    .from("proyecto_grupos")
    .select("grupo_id")
    .eq("proyecto_id", proyectoId);

  if (error) throw error;

  return (data ?? []).map((row) => row.grupo_id as string);
}

export async function renameProyecto(id: string, nombre: string) {
  const { error } = await supabase
    .from("proyectos")
    .update({ nombre })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProyecto(id: string) {
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw error;
}
