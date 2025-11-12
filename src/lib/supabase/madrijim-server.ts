import { supabase } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";
import { ensureProyectoAccess } from "@/lib/supabase/access";

export async function getMadrijimPorProyecto(userId: string, proyectoId: string) {
  const { grupoIds } = await ensureProyectoAccess(userId, proyectoId);
  if (grupoIds.length === 0) return [] as { clerk_id: string; nombre: string }[];

  const { data: relaciones, error } = await supabase
    .from("madrijim_grupos")
    .select("madrij_id")
    .in("grupo_id", grupoIds)
    .eq("invitado", false)
    .eq("activo", true);

  if (error) throw error;

  const ids = (relaciones ?? [])
    .map((r) => r.madrij_id as string | null)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const { data: madrijim, error: e2 } = await supabase
    .from("madrijim")
    .select("clerk_id, nombre")
    .in("clerk_id", ids);

  if (e2) throw e2;

  const nombreMap = new Map<string, string>();
  (madrijim ?? []).forEach((m) => {
    if (m.clerk_id) {
      nombreMap.set(m.clerk_id, m.nombre ?? "");
    }
  });

  const missingIds = ids.filter((id) => !nombreMap.has(id));

  for (const id of missingIds) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(id);
      const nombre =
        user.firstName ||
        user.username ||
        user.emailAddresses[0]?.emailAddress ||
        "";
      nombreMap.set(id, nombre);
    } catch {
      nombreMap.set(id, "");
    }
  }

  return ids.map((id) => ({ clerk_id: id, nombre: nombreMap.get(id) || "" }));
}
