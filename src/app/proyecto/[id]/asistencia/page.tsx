"use client";

import { useEffect, useState } from "react";

type Janij = {
  id: string;
  nombre: string;
  estado: "presente" | "ausente";
};

export default function AsistenciaPage() {
  const [janijim, setJanijim] = useState<Janij[]>([]);

  useEffect(() => {
    fetch("/api/asistencia")
      .then((res) => res.json())
      .then(setJanijim);
  }, []);

  const marcar = async (id: string, nuevoEstado: "presente" | "ausente") => {
    await fetch("/api/asistencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado: nuevoEstado }),
    });

    setJanijim((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, estado: nuevoEstado } : j
      )
    );
  };

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">Tomar Asistencia</h1>
      <ul className="space-y-4">
        {janijim.map((janij) => (
          <li
            key={janij.id}
            className="flex items-center justify-between bg-white shadow p-4 rounded-lg"
          >
            <span className="text-lg">{janij.nombre}</span>
            <button
              onClick={() =>
                marcar(
                  janij.id,
                  janij.estado === "presente" ? "ausente" : "presente"
                )
              }
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                janij.estado === "presente"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {janij.estado === "presente" ? "Presente" : "Ausente"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
