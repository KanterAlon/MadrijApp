"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NuevoProyectoPage() {
  const { user } = useUser();
  const router = useRouter();
  const [nombre, setNombre] = useState("");

  const handleCrear = async () => {
    if (!user) return;
    // Use the imported supabase client directly

    // 1. Crear proyecto
    const { data: proyecto, error: e1 } = await supabase
      .from("proyectos")
      .insert({ nombre, creador_id: user.id })
      .select()
      .single();

    if (e1) return alert("Error creando proyecto");

    // 2. Insertar relación con madrijim_proyectos
    const { error: e2 } = await supabase
      .from("madrijim_proyectos")
      .insert({ proyecto_id: proyecto.id, madrij_id: user.id, rol: "creador", invitado: false });

    if (e2) return alert("Error asignando proyecto");

    router.push(`/proyecto/${proyecto.id}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Nuevo Proyecto</h1>
      <input
        type="text"
        placeholder="Nombre del proyecto"
        className="p-2 border rounded w-full mb-4"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <button
        onClick={handleCrear}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Crear
      </button>
    </div>
  );
}
