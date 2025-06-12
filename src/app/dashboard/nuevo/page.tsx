"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";

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
        <Button
          variant="secondary"
          className="flex-1"
          icon={<X className="w-4 h-4" />}
          onClick={() => router.push('/dashboard')}
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
