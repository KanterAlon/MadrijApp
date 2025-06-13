"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackLink from "@/components/ui/back-link";
import Button from "@/components/ui/button";
import { addMaterialList } from "@/lib/supabase/materiales";
import { PlusCircle, X } from "lucide-react";

export default function NuevaListaPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const router = useRouter();

  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCrear = async () => {
    if (!proyectoId || creating || !titulo.trim() || !fecha) return;
    setCreating(true);
    try {
      const row = await addMaterialList(proyectoId, titulo.trim(), fecha);
      router.push(`/proyecto/${proyectoId}/materiales/${row.id}`);
    } catch {
      alert("Error creando lista");
    }
    setCreating(false);
  };

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded-2xl shadow">
      <BackLink href=".." className="mb-4 inline-flex" />
      <h1 className="text-2xl font-bold mb-4 text-center text-blue-700">
        Nueva Lista de Materiales
      </h1>
      <input
        type="text"
        placeholder="Título de la actividad"
        className="p-2 border rounded w-full mb-4"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <input
        type="date"
        className="p-2 border rounded w-full mb-4"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          icon={<X className="w-4 h-4" />}
          onClick={() => router.push("..")}
        >
          Cancelar
        </Button>
        <Button
          className="flex-1"
          onClick={handleCrear}
          loading={creating}
          icon={<PlusCircle className="w-4 h-4" />}
        >
          Crear
        </Button>
      </div>
    </div>
  );
}
