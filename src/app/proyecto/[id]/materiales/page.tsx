"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getMaterialLists, deleteMaterialList } from "@/lib/supabase/materiales";
import { Trash2 } from "lucide-react";

export default function MaterialesIndexPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const router = useRouter();
  const [listas, setListas] = useState<{ id: string; titulo: string; fecha: string }[]>([]);
  const hoy = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!proyectoId) return;
    getMaterialLists(proyectoId)
      .then(setListas)
      .catch(() => setListas([]));
  }, [proyectoId]);


  const eliminarLista = (id: string) => {
    if (!confirm("¿Eliminar lista?")) return;
    deleteMaterialList(id)
      .then(() => setListas((prev) => prev.filter((l) => l.id !== id)))
      .catch(() => alert("Error eliminando lista"));
  };

  const bandeja = listas.filter((l) => l.fecha > hoy);
  const listasPrevias = listas.filter((l) => !l.fecha || l.fecha <= hoy);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-900">Listas de materiales</h1>
      {listas.length === 0 && <p className="text-gray-600">No hay listas creadas.</p>}

      <details open>
        <summary className="font-semibold cursor-pointer mb-2">Bandeja de entrada</summary>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {bandeja.map((l) => (
            <div
              key={l.id}
              onClick={() => router.push(`./materiales/${l.id}`)}
              className="cursor-pointer rounded border p-4 bg-white shadow hover:shadow-md relative group"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  eliminarLista(l.id);
                }}
                className="absolute top-2 right-2 text-red-600 hover:text-red-800 hidden group-hover:block"
              >
                <Trash2 size={16} />
              </button>
              <h3 className="font-semibold">{l.titulo}</h3>
              <p className="text-sm text-gray-600">{l.fecha}</p>
            </div>
          ))}
        </div>
      </details>

      <details>
        <summary className="font-semibold cursor-pointer mb-2">Listas previas</summary>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {listasPrevias.map((l) => (
            <div
              key={l.id}
              onClick={() => router.push(`./materiales/${l.id}`)}
              className="cursor-pointer rounded border p-4 bg-white shadow hover:shadow-md relative group"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  eliminarLista(l.id);
                }}
                className="absolute top-2 right-2 text-red-600 hover:text-red-800 hidden group-hover:block"
              >
                <Trash2 size={16} />
              </button>
              <h3 className="font-semibold">{l.titulo}</h3>
              <p className="text-sm text-gray-600">{l.fecha}</p>
            </div>
          ))}
        </div>
      </details>
      <div className="mt-6">
        <Link
          href="./materiales/nueva"
          className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
        >
          + Crear nueva lista
        </Link>
      </div>
    </div>
  );
}
