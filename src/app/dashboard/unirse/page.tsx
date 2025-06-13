"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button";
import { Handshake } from "lucide-react";

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
      toast.error("Código inválido");
      setLoading(false);
      return;
    }

    const { error: e2 } = await supabase
      .from("madrijim_proyectos")
      .insert({ proyecto_id: proyecto.id, madrij_id: user.id, invitado: false });

    if (e2 && e2.code !== "23505") {
      toast.error("Error uniéndose al proyecto");
      setLoading(false);
      return;
    }

    router.push(`/proyecto/${proyecto.id}`);
  };

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded-2xl shadow">
      <Link
        href="/dashboard"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Volver
      </Link>
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
        Unirse a un Proyecto
      </h1>
      <label htmlFor="codigo" className="sr-only">
        Código de invitación
      </label>
      <input
        id="codigo"
        type="text"
        placeholder="Pegá aquí el código de invitación"
        className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
      />
      <Button
        className="w-full"
        onClick={handleJoin}
        loading={loading}
        icon={<Handshake className="w-4 h-4" />}
      >
        Unirse
      </Button>
    </div>
  );
}
