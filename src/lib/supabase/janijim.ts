import { supabase } from "@/lib/supabase";
import { getGrupoIdForProyecto } from "./projects";

export type JanijData = {
  /** Nombre y apellido del janij */
  nombre: string;
  dni?: string | null;
  numero_socio?: string | null;
  grupo?: string | null;
  tel_madre?: string | null;
  tel_padre?: string | null;
  extras?: Record<string, unknown> | null;
};

type RawMadrijGrupo = {
  madrij?: {
    id: string;
    nombre: string;
    email?: string | null;
  } | null;
};

type RawGrupoRelacion = {
  id: string;
  nombre: string;
  madrijim_grupos?: RawMadrijGrupo[] | null;
} | null;

type RawJanijSearchRow = {
  id: string;
  nombre: string;
  grupo?: string | null;
  tel_madre?: string | null;
  tel_padre?: string | null;
  extras?: Record<string, unknown> | null;
  grupo_rel?: RawGrupoRelacion;
};

export type JanijSearchResult = {
  id: string;
  nombre: string;
  grupoNombre: string | null;
  telMadre: string | null;
  telPadre: string | null;
  responsables: {
    id: string;
    nombre: string;
    email: string | null;
  }[];
  extras?: Record<string, unknown> | null;
};

export async function getJanijim(proyectoId: string) {
  const grupoId = await getGrupoIdForProyecto(proyectoId);

  const { data, error } = await supabase
    .from("janijim")
    .select(
      "id, nombre, dni, numero_socio, grupo, tel_madre, tel_padre, extras",
    )
    .eq("grupo_id", grupoId)
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addJanijim(proyectoId: string, items: JanijData[]) {
  const grupoId = await getGrupoIdForProyecto(proyectoId);

  const payload = items.map((item) => ({
    ...item,
    proyecto_id: proyectoId,
    grupo_id: grupoId,
  }));
  const { data, error } = await supabase
    .from("janijim")
    .insert(payload)
    .select();
  if (error) throw error;
  return data;
}

export async function updateJanij(
  proyectoId: string,
  id: string,
  data: Partial<JanijData>,
) {
  const grupoId = await getGrupoIdForProyecto(proyectoId);

  const payload = {
    ...data,
    proyecto_id: proyectoId,
    grupo_id: grupoId,
  };

  const { error } = await supabase
    .from("janijim")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function removeJanij(id: string) {
  const { error } = await supabase.from("janijim").update({ activo: false }).eq("id", id);
  if (error) throw error;
}

export async function searchJanijimGlobal(query: string) {
  const term = query.trim();
  if (!term) {
    return [] as JanijSearchResult[];
  }

  const { data, error } = await supabase
    .from("janijim")
    .select(
      `
        id,
        nombre,
        grupo,
        tel_madre,
        tel_padre,
        extras,
        grupo_rel:grupos (
          id,
          nombre,
          madrijim_grupos (
            madrij:madrijim (
              id,
              nombre,
              email
            )
          )
        )
      `,
    )
    .eq("activo", true)
    .ilike("nombre", `%${term}%`)
    .order("nombre", { ascending: true })
    .limit(25);

  if (error) {
    throw error;
  }

  const rows = ((Array.isArray(data) ? data : []) as unknown) as RawJanijSearchRow[];

  return rows.map<JanijSearchResult>((row) => {
    const responsables = Array.isArray(row.grupo_rel?.madrijim_grupos)
      ? row.grupo_rel!.madrijim_grupos!
          .map((rel) => rel.madrij)
          .filter((madrij): madrij is NonNullable<typeof madrij> => Boolean(madrij))
          .map((madrij) => ({
            id: madrij.id,
            nombre: madrij.nombre,
            email: madrij.email ?? null,
          }))
      : [];

    return {
      id: row.id,
      nombre: row.nombre,
      grupoNombre: row.grupo_rel?.nombre ?? row.grupo ?? null,
      telMadre: row.tel_madre ?? null,
      telPadre: row.tel_padre ?? null,
      extras: row.extras ?? undefined,
      responsables,
    };
  });
}
