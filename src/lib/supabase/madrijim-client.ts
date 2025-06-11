"use client";

export async function getMadrijimPorProyecto(proyectoId: string) {
  const res = await fetch(`/api/madrijim?id=${proyectoId}`);
  if (!res.ok) {
    throw new Error("Error cargando madrijim");
  }
  return (await res.json()) as { clerk_id: string; nombre: string }[];
}
