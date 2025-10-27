export type JanijExtraGroup = {
  id: string;
  nombre: string | null;
};

const EXTRAS_KEY = "otros_grupos";

function normalizeNombre(nombre: unknown): string | null {
  if (typeof nombre !== "string") {
    return null;
  }
  const trimmed = nombre.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseJanijExtras(source: unknown): JanijExtraGroup[] {
  if (!source || typeof source !== "object") {
    return [];
  }

  const rawList = (source as Record<string, unknown>)[EXTRAS_KEY];
  if (!Array.isArray(rawList)) {
    return [];
  }

  const seen = new Set<string>();
  const result: JanijExtraGroup[] = [];

  for (const raw of rawList) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const maybeId = (raw as { id?: unknown }).id;
    if (typeof maybeId !== "string" || maybeId.trim().length === 0) {
      continue;
    }
    const id = maybeId.trim();
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const nombre = normalizeNombre((raw as { nombre?: unknown }).nombre);
    result.push({ id, nombre });
  }

  return result;
}

export function withJanijExtras(
  current: unknown,
  extras: JanijExtraGroup[],
): Record<string, unknown> | null {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};

  const nextList = extras.map((item) => ({
    id: item.id,
    nombre: item.nombre ?? null,
  }));

  if (nextList.length > 0) {
    base[EXTRAS_KEY] = nextList;
  } else if (EXTRAS_KEY in base) {
    delete base[EXTRAS_KEY];
  }

  return Object.keys(base).length > 0 ? base : null;
}
