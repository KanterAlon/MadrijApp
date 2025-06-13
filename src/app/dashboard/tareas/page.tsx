"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { getProyectosParaUsuario } from "@/lib/supabase/projects";
import { getMateriales, MaterialRow, getMaterialLists } from "@/lib/supabase/materiales";
import { getMadrijNombre } from "@/lib/supabase/madrijim";

interface Tarea extends MaterialRow {
  lista?: { id: string; titulo: string; fecha: string } | null;
}

export default function MisTareasPage() {
  const { user } = useUser();
  const [tareas, setTareas] = useState<Tarea[]>([]);

  useEffect(() => {
    if (!user) return;
    const cargar = async () => {
      try {
        const nombre = await getMadrijNombre(user.id);
        const proyectos = (await getProyectosParaUsuario(user.id)) as unknown as { id: string }[];
        const all: Tarea[] = [];
        for (const p of proyectos) {
          const listas = await getMaterialLists(p.id);
          for (const lista of listas) {
            const mats = await getMateriales(p.id, lista.id);
            mats
              .filter((m) => m.asignado === nombre)
              .forEach((m) => all.push({ ...m, lista }));
          }
        }
        setTareas(all);
      } catch {
        setTareas([]);
      }
    };
    cargar();
  }, [user]);

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Volver
      </Link>
      <h1 className="text-3xl font-bold text-blue-900">Mis tareas</h1>
      {tareas.length === 0 && <p className="text-gray-600">No tienes tareas asignadas.</p>}
      <ul className="space-y-2">
        {tareas.map((t) => (
          <li key={t.id} className="border rounded p-3 bg-white shadow">
            <Link href={`/proyecto/${t.proyecto_id}/materiales/${t.lista?.id}`} className="font-medium hover:underline">
              {t.nombre}
            </Link>
            {t.lista && (
              <p className="text-sm text-gray-600">
                {t.lista.titulo} - {t.lista.fecha}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
