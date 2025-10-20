"use client";

import { AccessDeniedError } from "@/lib/supabase/access";

export async function getMadrijimPorProyecto(proyectoId: string) {
  const res = await fetch(`/api/madrijim?id=${proyectoId}`);
  if (!res.ok) {
    if (res.status === 403) {
      const payload = await res.json().catch(() => ({}));
      const message =
        typeof payload?.error === "string"
          ? payload.error
          : "No tenés permisos para ver los madrijim de este proyecto";
      throw new AccessDeniedError(message);
    }
    throw new Error("Error cargando madrijim");
  }
  return (await res.json()) as { clerk_id: string; nombre: string }[];
}
