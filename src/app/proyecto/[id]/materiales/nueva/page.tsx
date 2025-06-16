"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackLink from "@/components/ui/back-link";
import Button from "@/components/ui/button";
import { addMaterialList } from "@/lib/supabase/materiales";
import { PlusCircle, X } from "lucide-react";
import { showError } from "@/lib/alerts";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function NuevaListaPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const router = useRouter();

  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [creating, setCreating] = useState(false);
  const [tituloError, setTituloError] = useState(false);
  const [fechaError, setFechaError] = useState(false);

  const handleCrear = async () => {
    if (!proyectoId || creating) return;

    let valid = true;
    if (!titulo.trim()) {
      setTituloError(true);
      valid = false;
    }
    if (!fecha) {
      setFechaError(true);
      valid = false;
    }
    if (!valid) {
      toast.error("Completá todos los campos");
      return;
    }
    setCreating(true);
    try {
      const row = await addMaterialList(proyectoId, titulo.trim(), fecha);
      toast.success("Lista creada correctamente");
      router.push(`/proyecto/${proyectoId}/materiales/${row.id}`);
    } catch {
      showError("Error creando lista");
    }
    setCreating(false);
  };

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded-2xl shadow">
      <BackLink
        href={`/proyecto/${proyectoId}/materiales`}
        className="mb-4 inline-flex"
      />
      <h1 className="text-2xl font-bold mb-4 text-center text-blue-700">
        Nueva Lista de Materiales
      </h1>
      <input
        type="text"
        placeholder="Título de la actividad"
        className={cn(
          "p-2 border rounded w-full mb-1",
          tituloError && "border-red-500 focus:border-red-500"
        )}
        value={titulo}
        onChange={(e) => {
          setTitulo(e.target.value);
          if (tituloError && e.target.value.trim()) setTituloError(false);
        }}
      />
      {tituloError && (
        <p className="text-red-600 text-sm mb-3">Ingresá un título</p>
      )}
      <input
        type="date"
        className={cn(
          "p-2 border rounded w-full mb-1",
          fechaError && "border-red-500 focus:border-red-500"
        )}
        value={fecha}
        onChange={(e) => {
          setFecha(e.target.value);
          if (fechaError && e.target.value) setFechaError(false);
        }}
      />
      {fechaError && (
        <p className="text-red-600 text-sm mb-3">Seleccioná una fecha</p>
      )}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          icon={<X className="w-4 h-4" />}
          onClick={() =>
            router.push(`/proyecto/${proyectoId}/materiales`)
          }
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
