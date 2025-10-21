import { supabase } from "@/lib/supabase";
import { isMissingRelationError } from "@/lib/supabase/errors";
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

export type JanijRecord = {
  id: string;
  nombre: string;
  dni: string | null;
  numero_socio: string | null;
  grupo: string | null;
  grupo_id?: string | null;
  tel_madre: string | null;
  tel_padre: string | null;
  extras?: Record<string, unknown> | null;
  gruposAdicionales?: { id: string; nombre: string | null }[];
};

type RawMadrijGrupo = {
  madrij_id?: string | null;
  nombre?: string | null;
  email?: string | null;
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

const BASE_FIELDS = "id, nombre, dni, numero_socio, grupo, grupo_id, tel_madre, tel_padre, extras";

function baseJanijQuery(select: string, options?: { includeInactive?: boolean }) {
  const query = supabase.from("janijim").select(select).order("nombre", { ascending: true });
  if (!options?.includeInactive) {
    query.eq("activo", true);
  }
  return query;
}

export async function getJanijim(proyectoId: string, userId: string) {
  const { grupoIds } = await ensureProyectoAccess(userId, proyectoId);
  if (grupoIds.length === 0) return [];

  const relationName = "janijim_grupos_extra";
  const { data: extraLinks, error: extraError } = await supabase
    .from(relationName)
    .select("janij_id, grupo_id")
    .in("grupo_id", grupoIds);

  const extrasTableAvailable = !extraError || !isMissingRelationError(extraError, relationName);
  if (extraError && !isMissingRelationError(extraError, relationName)) {
    throw extraError;
  }

  const extraJanijIds = new Set<string>();
  const safeExtraLinks = extrasTableAvailable ? extraLinks : [];
  for (const row of safeExtraLinks ?? []) {
    const janijId = row?.janij_id as string | null;
    if (janijId) {
      extraJanijIds.add(janijId);
    }
  }

  const filterClauses: string[] = [];
  if (grupoIds.length > 0) {
    const quoted = grupoIds.map((id) => `"${id}"`).join(",");
    filterClauses.push(`grupo_id.in.(${quoted})`);
  }
  if (extraJanijIds.size > 0) {
    const quotedExtras = Array.from(extraJanijIds)
      .map((id) => `"${id}"`)
      .join(",");
    filterClauses.push(`id.in.(${quotedExtras})`);
  }

  if (filterClauses.length === 0) {
    return [];
  }

  const selectFields = extrasTableAvailable
    ? `${BASE_FIELDS}, grupos_extra:janijim_grupos_extra ( grupo_id, grupo:grupos ( id, nombre ) )`
    : BASE_FIELDS;
  const builder = baseJanijQuery(selectFields);
  builder.or(filterClauses.join(","));

  const { data, error } = await builder;
  if (error) throw error;

  type RawJanijWithExtras = JanijRecord & {
    grupos_extra?: {
      grupo_id?: string | null;
      grupo?: { id?: string | null; nombre?: string | null } | null;
    }[];
  };

  const result: JanijRecord[] = [];
  for (const row of data ?? []) {
    if (!row || typeof row !== "object" || "error" in row) {
      continue;
    }
    const raw = row as RawJanijWithExtras;
    const gruposExtras = Array.isArray(raw.grupos_extra)
      ? raw.grupos_extra
          .map((extra) => {
            const id = (extra?.grupo_id as string | null) ?? (extra?.grupo?.id as string | null) ?? null;
            const nombre = (extra?.grupo?.nombre as string | null) ?? null;
            if (!id) {
              return null;
            }
            return { id, nombre };
          })
          .filter((value): value is { id: string; nombre: string | null } => value !== null)
      : [];
    const { grupos_extra: _omit, ...rest } = raw;
    void _omit;
    result.push({
      ...rest,
      gruposAdicionales: gruposExtras,
    });
  }
  return result;
}

export async function getGlobalJanijim(): Promise<JanijRecord[]> {
  const { data, error } = await baseJanijQuery(`${BASE_FIELDS}, proyecto_id`);
  if (error) throw error;
  const result: JanijRecord[] = [];
  for (const row of data ?? []) {
    if (!row || typeof row !== "object" || "error" in row) {
      continue;
    }
    result.push(row as JanijRecord);
  }
  return result;
}

export async function addJanijim(_proyectoId: string, _items: JanijData[]): Promise<JanijRecord[]> {
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
    throw new AccessDeniedError("No tenÃ©s permisos para buscar en toda la aplicaciÃ³n");
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
            madrij_id,
            nombre,
            email
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
      ? row.grupo_rel.madrijim_grupos!
          .map((rel) => ({
            id: rel.madrij_id ?? rel.nombre ?? "",
            nombre: rel.nombre ?? "Madrij sin nombre",
            email: rel.email ?? null,
          }))
          .filter((entry) => entry.nombre || entry.email)
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


