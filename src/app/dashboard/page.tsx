"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { getProyectosParaUsuario } from "@/lib/supabase/projects";

export default function DashboardPage() {
  const { user } = useUser();
  const [proyectos, setProyectos] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    getProyectosParaUsuario(user.id)
      .then(setProyectos)
      .catch((err) => console.error("Error cargando proyectos", err));
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tus Proyectos</h1>

      <div className="space-y-4">
        {proyectos.map((p) => (
          <Link
            key={p.id}
            href={`/proyecto/${p.id}`}
            className="block p-4 border rounded-lg hover:bg-gray-100 transition"
          >
            {p.nombre}
          </Link>
        ))}

        <Link
          href="/dashboard/nuevo"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          + Crear nuevo proyecto
        </Link>
      </div>
    </div>
  );
}
