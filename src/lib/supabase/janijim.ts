import { supabase } from "@/lib/supabase";
import {
  AccessDeniedError,
  ensureProyectoAccess,
  getUserAccessContext,
} from "@/lib/supabase/access";

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

export async function getJanijim(proyectoId: string, userId: string) {
  const { grupoIds } = await ensureProyectoAccess(userId, proyectoId);
  if (grupoIds.length === 0) return [];

  const { data, error } = await supabase
    .from("janijim")
    .select("id, nombre, dni, numero_socio, grupo, grupo_id, tel_madre, tel_padre, extras")
    .in("grupo_id", grupoIds)
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addJanijim(_proyectoId: string, _items: JanijData[]) {
  void _proyectoId;
  void _items;
  throw new Error("Los janijim se gestionan exclusivamente desde Google Sheets");
}

export async function updateJanij(
  _proyectoId: string,
  _id: string,
  _data: Partial<JanijData>,
) {
  void _proyectoId;
  void _id;
  void _data;
  throw new Error("Actualiza los datos del janij directamente en la planilla institucional");
}

export async function removeJanij(_id: string) {
  void _id;
  throw new Error("Los janijim se desactivan desde la hoja de calculo institucional");
}

export async function searchJanijimGlobal(userId: string, query: string) {
  const term = query.trim();
  if (!term) {
    return [] as JanijSearchResult[];
  }

  const context = await getUserAccessContext(userId);
  if (!context.isAdmin && !context.isDirector) {
    throw new AccessDeniedError("No tenés permisos para buscar en toda la aplicación");
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
