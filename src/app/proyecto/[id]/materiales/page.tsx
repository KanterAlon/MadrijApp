"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMaterialLists, deleteMaterialList } from "@/lib/supabase/materiales";
import { Trash2, PlusCircle } from "lucide-react";
import { showError, confirmDialog } from "@/lib/alerts";
import Skeleton from "@/components/ui/skeleton";

export default function MaterialesIndexPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const router = useRouter();
  const [listas, setListas] = useState<{ id: string; titulo: string; fecha: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const hoy = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!proyectoId) return;
    setLoading(true);
    getMaterialLists(proyectoId)
      .then(setListas)
      .catch(() => setListas([]))
      .finally(() => setLoading(false));
  }, [proyectoId]);


  const eliminarLista = async (id: string) => {
    if (!(await confirmDialog("¿Eliminar lista?"))) return;
    deleteMaterialList(id)
      .then(() => setListas((prev) => prev.filter((l) => l.id !== id)))
      .catch(() => showError("Error eliminando lista"));
  };

  const bandeja = listas.filter((l) => l.fecha >= hoy);
  const listasPrevias = listas.filter((l) => !l.fecha || l.fecha < hoy);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-900">Listas de materiales</h1>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
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
          <div
            key="crear"
            onClick={() => router.push("./materiales/nueva")}
            className="cursor-pointer rounded border-2 border-dashed p-4 bg-white flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50"
          >
          <PlusCircle className="w-6 h-6" />
          <span className="mt-2 font-semibold">Crear nueva lista</span>
        </div>
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
        </>
      )}
    </div>
  );
}
