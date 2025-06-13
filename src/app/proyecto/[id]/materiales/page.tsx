"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMaterialLists, addMaterialList } from "@/lib/supabase/materiales";
import Button from "@/components/ui/button";

export default function MaterialesIndexPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const router = useRouter();
  const [listas, setListas] = useState<{ id: string; titulo: string; fecha: string }[]>([]);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    if (!proyectoId) return;
    getMaterialLists(proyectoId)
      .then(setListas)
      .catch(() => setListas([]));
  }, [proyectoId]);

  const crearLista = () => {
    if (!titulo.trim() || !fecha) return;
    addMaterialList(proyectoId, titulo.trim(), fecha)
      .then((row) => {
        setListas((prev) => [...prev, row]);
        setTitulo("");
        setFecha("");
      })
      .catch(() => alert("Error creando lista"));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-900">Listas de materiales</h1>
      {listas.length === 0 && <p className="text-gray-600">No hay listas creadas.</p>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listas.map((l) => (
          <div
            key={l.id}
            onClick={() => router.push(`./materiales/${l.id}`)}
            className="cursor-pointer rounded border p-4 bg-white shadow hover:shadow-md"
          >
            <h3 className="font-semibold">{l.titulo}</h3>
            <p className="text-sm text-gray-600">{l.fecha}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-blue-800">Crear nueva lista</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título de la actividad"
            className="border rounded p-2 flex-1"
          />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border rounded p-2"
          />
          <Button onClick={crearLista}>Agregar</Button>
        </div>
      </div>
    </div>
  );
}
