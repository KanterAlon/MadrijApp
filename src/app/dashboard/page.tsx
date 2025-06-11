"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { getProyectosParaUsuario } from "@/lib/supabase/projects";
import Loader from "@/components/ui/loader";

type Proyecto = {
  id: string;
  nombre: string;
};

export default function DashboardPage() {
  const { user } = useUser();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getProyectosParaUsuario(user.id)
      .then((data) => setProyectos(data.flat()))
      .catch((err) => console.error("Error cargando proyectos", err))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tus Proyectos</h1>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader className="h-6 w-6" />
          </div>
        ) : (
          proyectos.map((p) => (
            <Link
              key={p.id}
              href={`/proyecto/${p.id}`}
              className="block p-4 border rounded-lg hover:bg-gray-100 transition"
            >
              {p.nombre}
            </Link>
          ))
        )}

        <Link
          href="/dashboard/nuevo"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          + Crear nuevo proyecto
        </Link>
        <Link
          href="/dashboard/unirse"
          className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Unirse a proyecto
        </Link>
      </div>
    </div>
  );
}
