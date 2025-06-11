"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/ui/loader";

export default function UnirseProyectoPage() {
  const { user } = useUser();
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!user || !codigo || loading) return;
    setLoading(true);
    const { data: proyecto, error } = await supabase
      .from("proyectos")
      .select("id")
      .eq("codigo_invite", codigo)
      .single();

    if (!proyecto || error) {
      alert("Código inválido");
      setLoading(false);
      return;
    }

    const { error: e2 } = await supabase
      .from("madrijim_proyectos")
      .insert({ proyecto_id: proyecto.id, madrij_id: user.id, invitado: false });

    if (e2 && e2.code !== "23505") {
      alert("Error uniéndose al proyecto");
      setLoading(false);
      return;
    }

    router.push(`/proyecto/${proyecto.id}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Unirse a un Proyecto</h1>
      <input
        type="text"
        placeholder="Código de invitación"
        className="p-2 border rounded w-full mb-4"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
      />
      <button
        onClick={handleJoin}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-75 flex items-center gap-2"
      >
        {loading && <Loader className="h-4 w-4" />}
        <span>Unirse</span>
      </button>
    </div>
  );
}