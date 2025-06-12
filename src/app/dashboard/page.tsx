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
      <h1 className="text-3xl font-bold mb-6 text-blue-900">Tus Proyectos</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-6 w-6" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proyectos.map((p) => (
            <Link
              key={p.id}
              href={`/proyecto/${p.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-6 shadow hover:shadow-md transition"
            >
              <h2 className="text-lg font-medium">{p.nombre}</h2>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/dashboard/nuevo"
          className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-center font-medium text-white transition hover:bg-blue-700"
        >
          + Crear nuevo proyecto
        </Link>
        <Link
          href="/dashboard/unirse"
          className="flex-1 rounded-md bg-green-600 px-4 py-3 text-center font-medium text-white transition hover:bg-green-700"
        >
          + Unirse a proyecto
        </Link>
      </div>
    </div>
  );
}
