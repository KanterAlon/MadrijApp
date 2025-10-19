import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import removeAccents from "remove-accents";

import { getJanijimRows, getMadrijimRows } from "@/lib/google/sheets";
import { supabase } from "@/lib/supabase";

const JAN_HEADERS: Record<string, keyof JanijRow> = {
  nombre: "nombre",
  "nombreyapellido": "nombre",
  "nombre y apellido": "nombre",
  "apellidonombre": "nombre",
  dni: "dni",
  documento: "dni",
  "numero socio": "numero_socio",
  "nrosocio": "numero_socio",
  "numero_de_socio": "numero_socio",
  grupo: "grupo",
  kvutza: "grupo",
  kvutzaot: "grupo",
  "tel madre": "tel_madre",
  "telmadre": "tel_madre",
  "telefono madre": "tel_madre",
  "tel padre": "tel_padre",
  "telpadre": "tel_padre",
  "telefono padre": "tel_padre",
};

const MAD_HEADERS: Record<string, keyof MadrijRow> = {
  nombre: "nombre",
  "nombre y apellido": "nombre",
  email: "email",
  mail: "email",
  correo: "email",
  "rol": "rol",
  "role": "rol",
  "clerk_id": "clerk_id",
  "clerk id": "clerk_id",
  "madrij_id": "clerk_id",
  "id": "clerk_id",
};

type JanijRow = {
  nombre: string;
  dni: string | null;
  numero_socio: string | null;
  grupo: string | null;
  tel_madre: string | null;
  tel_padre: string | null;
};

type MadrijRow = {
  nombre: string | null;
  email: string | null;
  rol: string | null;
  clerk_id: string | null;
};

type SyncedMadrij = {
  madrij_id: string | null;
  email: string | null;
  nombre: string | null;
  rol: string | null;
};

type MadrijGrupoRow = {
  id: string;
  madrij_id: string | null;
  email: string | null;
  nombre: string | null;
  rol: string | null;
  invitado: boolean | null;
  activo: boolean | null;
};

function normalizeKey(value: string) {
  return removeAccents(value).trim().toLowerCase();
}

function normaliseHeader(header: string) {
  return normalizeKey(header.replace(/[^\p{L}\p{N}]+/gu, ""));
}

function mapColumns<T extends string>(
  headerRow: string[] | undefined,
  dictionary: Record<string, T>,
) {
  if (!headerRow || headerRow.length === 0) {
    return {} as Record<T, number | undefined>;
  }
  const mapping: Partial<Record<T, number>> = {};
  headerRow.forEach((header, index) => {
    const normalized = normaliseHeader(String(header));
    const key = dictionary[normalized];
    if (key && mapping[key] === undefined) {
      mapping[key] = index;
    }
  });
  return mapping as Record<T, number | undefined>;
}

function readCell(row: unknown[], index: number | undefined) {
  if (index === undefined) return null;
  const value = row[index];
  if (value == null) return null;
  return String(value).trim();
}

function buildJanijRows(rows: unknown[][]) {
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  const mapping = mapColumns(header as string[], JAN_HEADERS);

  const janijim: JanijRow[] = [];
  for (const raw of dataRows) {
    const nombre = readCell(raw, mapping.nombre);
    if (!nombre) continue;
    janijim.push({
      nombre,
      dni: readCell(raw, mapping.dni),
      numero_socio: readCell(raw, mapping.numero_socio),
      grupo: readCell(raw, mapping.grupo),
      tel_madre: readCell(raw, mapping.tel_madre),
      tel_padre: readCell(raw, mapping.tel_padre),
    });
  }
  return janijim;
}

function normalizeEmail(email: string | null | undefined) {
  if (!email) return null;
  return email.trim().toLowerCase();
}

function buildMadrijRows(rows: unknown[][]) {
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  const mapping = mapColumns(header as string[], MAD_HEADERS);
  const madrijim: MadrijRow[] = [];
  for (const raw of dataRows) {
    const email = normalizeEmail(readCell(raw, mapping.email));
    const clerk = readCell(raw, mapping.clerk_id);
    const nombre = readCell(raw, mapping.nombre);
    const rol = readCell(raw, mapping.rol);
    if (!email && !clerk) continue;
    madrijim.push({
      email: email || null,
      clerk_id: clerk || null,
      nombre: nombre || null,
      rol: rol || null,
    });
  }
  return madrijim;
}

async function resolveMadrijIds(rows: MadrijRow[]) {
  const lookupEmails = Array.from(
    new Set(
      rows
        .filter((row) => row.email)
        .map((row) => row.email!),
    ),
  );

  const emailMap = new Map<
    string,
    { clerk_id: string | null; nombre: string | null }
  >();
  if (lookupEmails.length > 0) {
    const { data, error } = await supabase
      .from("madrijim")
      .select("clerk_id, email, nombre")
      .in("email", lookupEmails);
    if (error) throw error;
    data.forEach((entry) => {
      if (entry.email) {
        emailMap.set(entry.email, {
          clerk_id: entry.clerk_id ?? null,
          nombre: entry.nombre ?? null,
        });
      }
    });
  }

  return rows.map((row) => {
    const existing = row.email ? emailMap.get(row.email) : undefined;
    const resolved = row.clerk_id
      ? row.clerk_id
      : existing?.clerk_id
        ? existing.clerk_id
        : null;
    const nombre = row.nombre ?? existing?.nombre ?? null;
    return {
      madrij_id: resolved,
      email: row.email,
      nombre,
      rol: row.rol,
    } satisfies SyncedMadrij;
  });
}

async function syncMadrijProfiles(rows: SyncedMadrij[]) {
  const emailMap = new Map<string, SyncedMadrij>();
  for (const row of rows) {
    if (!row.email) continue;
    const existing = emailMap.get(row.email);
    if (!existing) {
      emailMap.set(row.email, { ...row });
      continue;
    }
    if (!existing.nombre && row.nombre) {
      existing.nombre = row.nombre;
    }
    if (!existing.madrij_id && row.madrij_id) {
      existing.madrij_id = row.madrij_id;
    }
  }

  const payload = Array.from(emailMap.values()).map((row) => {
    const record: Record<string, unknown> = {
      email: row.email!,
    };
    if (row.nombre) {
      record.nombre = row.nombre;
    }
    if (row.madrij_id) {
      record.clerk_id = row.madrij_id;
    }
    return record;
  });

  if (payload.length === 0) return;

  const { error } = await supabase
    .from("madrijim")
    .upsert(payload, { onConflict: "email" });
  if (error) throw error;
}

async function syncMadrijim(grupoId: string, rows: SyncedMadrij[]) {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, deactivated: 0 };
  }

  const { data: existingMad, error: existingMadError } = await supabase
    .from("madrijim_grupos")
    .select("id, madrij_id, email, nombre, rol, invitado, activo")
    .eq("grupo_id", grupoId);
  if (existingMadError) throw existingMadError;

  const madRows = (existingMad ?? []) as MadrijGrupoRow[];

  const madKey = (entry: { madrij_id: string | null; email: string | null }) => {
    if (entry.madrij_id) return `id:${normalizeKey(entry.madrij_id)}`;
    if (entry.email) return `mail:${normalizeKey(entry.email)}`;
    return "";
  };

  const madEntries = madRows
    .map((row) => {
      const key = madKey(row);
      return key ? ([key, row] as const) : null;
    })
    .filter((entry): entry is readonly [string, MadrijGrupoRow] => entry !== null);

  const madMap = new Map(madEntries);

  const madSeen = new Set<string>();
  const madUpdates: {
    id: string;
    madrij_id: string | null;
    nombre: string | null;
    email: string | null;
    rol: string | null;
    activo: boolean;
    invitado: boolean;
  }[] = [];
  const madInserts: {
    grupo_id: string;
    madrij_id: string | null;
    nombre: string | null;
    email: string | null;
    rol: string | null;
    activo: boolean;
    invitado: boolean;
  }[] = [];

  for (const row of rows) {
    const key = row.madrij_id
      ? `id:${normalizeKey(row.madrij_id)}`
      : row.email
        ? `mail:${normalizeKey(row.email)}`
        : "";
    if (!key) continue;
    madSeen.add(key);
    const existing = madMap.get(key);
    if (existing) {
      const nextMadrijId = row.madrij_id ?? existing.madrij_id ?? null;
      madUpdates.push({
        id: existing.id,
        madrij_id: nextMadrijId,
        nombre: row.nombre ?? existing.nombre ?? null,
        email: row.email ?? existing.email ?? null,
        rol: row.rol ?? existing.rol ?? null,
        activo: true,
        invitado: false,
      });
    } else {
      madInserts.push({
        grupo_id: grupoId,
        madrij_id: row.madrij_id ?? null,
        nombre: row.nombre,
        email: row.email,
        rol: row.rol,
        activo: true,
        invitado: false,
      });
    }
  }

  if (madInserts.length > 0) {
    const { error } = await supabase.from("madrijim_grupos").insert(madInserts);
    if (error) throw error;
  }

  if (madUpdates.length > 0) {
    const { error } = await supabase
      .from("madrijim_grupos")
      .upsert(madUpdates, { onConflict: "id" });
    if (error) throw error;
  }

  const madDeactivate = madRows
    .filter((row) => row.activo !== false)
    .filter((row) => !madSeen.has(madKey(row)));

  if (madDeactivate.length > 0) {
    const { error } = await supabase
      .from("madrijim_grupos")
      .update({ activo: false })
      .in(
        "id",
        madDeactivate.map((row) => row.id),
      );
    if (error) throw error;
  }

  return {
    inserted: madInserts.length,
    updated: madUpdates.length,
    deactivated: madDeactivate.length,
  };
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: grupoId } = await context.params;
    if (!grupoId) {
      return NextResponse.json({ error: "Missing grupo" }, { status: 400 });
    }

    const { data: grupo, error: grupoError } = await supabase
      .from("grupos")
      .select("id, spreadsheet_id, janij_sheet, madrij_sheet")
      .eq("id", grupoId)
      .maybeSingle();

    if (grupoError || !grupo) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    const { data: proyecto, error: proyectoError } = await supabase
      .from("proyectos")
      .select("id")
      .eq("grupo_id", grupoId)
      .maybeSingle();

    if (proyectoError || !proyecto) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const proyectoId = proyecto.id;

    const { data: membership } = await supabase
      .from("madrijim_grupos")
      .select("id")
      .eq("grupo_id", grupoId)
      .eq("madrij_id", userId)
      .eq("activo", true)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!grupo.spreadsheet_id || !grupo.janij_sheet) {
      return NextResponse.json(
        { error: "El grupo no tiene hojas configuradas" },
        { status: 400 },
      );
    }

    const [janijRows, madrijRows] = await Promise.all([
      getJanijimRows(grupo.spreadsheet_id, grupo.janij_sheet),
      grupo.madrij_sheet
        ? getMadrijimRows(grupo.spreadsheet_id, grupo.madrij_sheet)
        : Promise.resolve([]),
    ]);

    const janijim = buildJanijRows(janijRows);
    const madrijim = await resolveMadrijIds(buildMadrijRows(madrijRows));
    await syncMadrijProfiles(madrijim);

    const { data: existingJanij, error: existingJanijError } = await supabase
      .from("janijim")
      .select("id, nombre, activo")
      .eq("grupo_id", grupoId);
    if (existingJanijError) throw existingJanijError;

    const janijMap = new Map(
      (existingJanij || []).map((row) => [normalizeKey(row.nombre), row]),
    );

    const janijSeen = new Set<string>();
    const janijUpdates: {
      id: string;
      proyecto_id: string;
      grupo_id: string;
      nombre: string;
      dni: string | null;
      numero_socio: string | null;
      grupo: string | null;
      tel_madre: string | null;
      tel_padre: string | null;
      activo: boolean;
    }[] = [];
    const janijInserts: {
      proyecto_id: string;
      grupo_id: string;
      nombre: string;
      dni: string | null;
      numero_socio: string | null;
      grupo: string | null;
      tel_madre: string | null;
      tel_padre: string | null;
      activo: boolean;
    }[] = [];

    for (const row of janijim) {
      const key = normalizeKey(row.nombre);
      janijSeen.add(key);
      const existing = janijMap.get(key);
      if (existing) {
        janijUpdates.push({
          id: existing.id,
          proyecto_id: proyectoId,
          grupo_id: grupoId,
          nombre: row.nombre,
          dni: row.dni,
          numero_socio: row.numero_socio,
          grupo: row.grupo,
          tel_madre: row.tel_madre,
          tel_padre: row.tel_padre,
          activo: true,
        });
      } else {
        janijInserts.push({
          proyecto_id: proyectoId,
          grupo_id: grupoId,
          nombre: row.nombre,
          dni: row.dni,
          numero_socio: row.numero_socio,
          grupo: row.grupo,
          tel_madre: row.tel_madre,
          tel_padre: row.tel_padre,
          activo: true,
        });
      }
    }

    if (janijInserts.length > 0) {
      const { error } = await supabase.from("janijim").insert(janijInserts);
      if (error) throw error;
    }

    if (janijUpdates.length > 0) {
      const { error } = await supabase
        .from("janijim")
        .upsert(janijUpdates, { onConflict: "id" });
      if (error) throw error;
    }

    const janijDeactivate = (existingJanij || [])
      .filter((row) => row.activo !== false)
      .filter((row) => !janijSeen.has(normalizeKey(row.nombre)));

    if (janijDeactivate.length > 0) {
      const { error } = await supabase
        .from("janijim")
        .update({ activo: false })
        .in(
          "id",
          janijDeactivate.map((row) => row.id),
        );
      if (error) throw error;
    }

    return NextResponse.json({
      janijim: {
        inserted: janijInserts.length,
        updated: janijUpdates.length,
        deactivated: janijDeactivate.length,
      },
      madrijim: await syncMadrijim(grupo.id, madrijim),
    });
  } catch (error) {
    console.error("Sync error", error);
    return NextResponse.json({ error: "Error sincronizando" }, { status: 500 });
  }
}
