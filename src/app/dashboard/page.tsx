"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  getProyectosParaUsuario,
  renameProyecto,
  deleteProyecto,
} from "@/lib/supabase/projects";
import Loader from "@/components/ui/loader";
import { Pencil, Trash2, Check, X } from "lucide-react";

type Proyecto = {
  id: string;
  nombre: string;
  creador_id: string;
};

export default function DashboardPage() {
  const { user } = useUser();
  const [creados, setCreados] = useState<Proyecto[]>([]);
  const [compartidos, setCompartidos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getProyectosParaUsuario(user.id)
      .then((data) => {
        const list = data.flat();
        setCreados(list.filter((p) => p.creador_id === user.id));
        setCompartidos(list.filter((p) => p.creador_id !== user.id));
      })
      .catch((err) => console.error("Error cargando proyectos", err))
      .finally(() => setLoading(false));
  }, [user]);

  const startEditing = (id: string, nombre: string) => {
    setEditingId(id);
    setEditName(nombre);
  };

  const confirmEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (name === "") {
      setEditingId(null);
      return;
    }
    try {
      await renameProyecto(editingId, name);
      setCreados((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, nombre: name } : p))
      );
    } catch {
      alert("Error renombrando proyecto");
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar proyecto?")) return;
    try {
      await deleteProyecto(id);
      setCreados((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Error eliminando proyecto");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-blue-900">Proyectos</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-6 w-6" />
        </div>
      ) : (
        <>
          {creados.length > 0 && (
            <div className="space-y-2 mb-6">
              <h2 className="text-xl font-semibold">Creados por ti</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {creados.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow"
                  >
                    {editingId === p.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="p-1 border rounded flex-1 mr-2"
                        autoFocus
                      />
                    ) : (
                      <Link
                        href={`/proyecto/${p.id}`}
                        className="flex-1 font-medium hover:underline"
                      >
                        {p.nombre}
                      </Link>
                    )}
                    <div className="flex items-center gap-2 ml-2">
                      {editingId === p.id ? (
                        <>
                          <button
                            onClick={confirmEdit}
                            aria-label="Guardar"
                            className="text-green-600 hover:text-green-800"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            aria-label="Cancelar"
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(p.id, p.nombre)}
                            aria-label="Editar"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            aria-label="Eliminar"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {compartidos.length > 0 && (
            <div className="space-y-2 mb-6">
              <h2 className="text-xl font-semibold">Compartidos contigo</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {compartidos.map((p) => (
                  <Link
                    key={p.id}
                    href={`/proyecto/${p.id}`}
                    className="block rounded-xl border border-gray-200 bg-white p-4 shadow hover:shadow-md transition"
                  >
                    <h3 className="text-lg font-medium">{p.nombre}</h3>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
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
