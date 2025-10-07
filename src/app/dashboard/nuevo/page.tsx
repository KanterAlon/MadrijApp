"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import BackLink from "@/components/ui/back-link";
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

    const nombreProyecto = nombre.trim();
    if (!nombreProyecto) {
      toast.error("Ingresá un nombre válido");
      setCreating(false);
      return;
    }

    const { data: grupo, error: groupError } = await supabase
      .from("grupos")
      .insert({ nombre: nombreProyecto })
      .select()
      .single();

    if (groupError || !grupo) {
      toast.error("Error creando grupo");
      setCreating(false);
      return;
    }

    const { data: proyecto, error: e1 } = await supabase
      .from("proyectos")
      .insert({ nombre: nombreProyecto, creador_id: user.id, grupo_id: grupo.id })
      .select()
      .single();

    if (e1 || !proyecto) {
      toast.error("Error creando proyecto");
      setCreating(false);
      return;
    }

    const { error: e2 } = await supabase
      .from("madrijim_grupos")
      .insert({ grupo_id: grupo.id, madrij_id: user.id, rol: "creador", invitado: false });

    if (e2 && e2.code !== "23505") {
      toast.error("Error asignando grupo");
      setCreating(false);
      return;
    }

    toast.success("Proyecto creado correctamente");

    router.push(`/proyecto/${proyecto.id}`);
    setCreating(false);
  };

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded-2xl shadow">
      <BackLink href="/dashboard" className="mb-4 inline-flex" />
      <h1 className="text-2xl font-bold mb-4 text-center text-blue-700">
        Nuevo Proyecto
      </h1>
      <input
        type="text"
        placeholder="Ej.: Campamento de verano"
        className="p-2 border rounded w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
