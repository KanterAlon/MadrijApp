"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/ui/loader";

export default function NuevoProyectoPage() {
  const { user } = useUser();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCrear = async () => {
    if (!user || creating) return;
    setCreating(true);
    // Use the imported supabase client directly

    // 1. Crear proyecto
    const { data: proyecto, error: e1 } = await supabase
      .from("proyectos")
      .insert({ nombre, creador_id: user.id })
      .select()
      .single();

    if (e1) {
      toast.error("Error creando proyecto");
      return;
    }

    // 2. Insertar relación con madrijim_proyectos
    const { error: e2 } = await supabase
      .from("madrijim_proyectos")
      .insert({ proyecto_id: proyecto.id, madrij_id: user.id, rol: "creador", invitado: false });

    if (e2) {
      toast.error("Error asignando proyecto");
      setCreating(false);
      return;
    }

    router.push(`/proyecto/${proyecto.id}`);
    setCreating(false);
  };

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded-2xl shadow">
      <Link
        href="/dashboard"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Volver
      </Link>
      <h1 className="text-2xl font-bold mb-4 text-center text-blue-700">
        Nuevo Proyecto
      </h1>
      <input
        type="text"
        placeholder="Ej.: Campamento de verano"
        className="p-2 border rounded w-full mb-4"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
        >
          Cancelar
        </button>
        <button
          onClick={handleCrear}
          disabled={creating}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-75 flex items-center justify-center gap-2"
        >
          {creating && <Loader className="h-4 w-4" />}
          <span>Crear</span>
        </button>
      </div>
    </div>
  );
}
