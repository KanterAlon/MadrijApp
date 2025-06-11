import { supabase } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

export async function getMadrijimPorProyecto(proyectoId: string) {
  const { data: relaciones, error } = await supabase
    .from("madrijim_proyectos")
    .select("madrij_id")
    .eq("proyecto_id", proyectoId)
    .eq("invitado", false);

  if (error) throw error;

  const ids = relaciones.map((r) => r.madrij_id);
  if (ids.length === 0) return [];

  const { data: madrijim, error: e2 } = await supabase
    .from("madrijim")
    .select("clerk_id, nombre")
    .in("clerk_id", ids);

  if (e2) throw e2;

  const nombreMap = new Map<string, string>();
  madrijim.forEach((m) => nombreMap.set(m.clerk_id, m.nombre));

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
    } catch (err) {
      console.error("Error fetching Clerk user", err);
      nombreMap.set(id, "");
    }
  }

  return ids.map((id) => ({ clerk_id: id, nombre: nombreMap.get(id) || "" }));
}