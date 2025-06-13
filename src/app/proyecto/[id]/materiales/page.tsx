"use client";

import { useState } from "react";
import { Kanban } from "lucide-react";
import Button from "@/components/ui/button";

export default function MaterialesPage() {
  type Estado =
    | "por hacer"
    | "en progreso"
    | "realizado"
    | "disponible"
    | "a retirar";

  type Material = {
    id: string;
    nombre: string;
    tipo: "realizable" | "crudo";
    requiereArmado: boolean;
    compra: boolean;
    sede: boolean;
    sanMiguel: boolean;
    asignado: string;
    estado: Estado;
  };

  const estados: Estado[] = [
    "por hacer",
    "en progreso",
    "realizado",
    "disponible",
    "a retirar",
  ];

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<"realizable" | "crudo">("realizable");
  const [nuevoArmado, setNuevoArmado] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | "realizable" | "crudo">("todos");

  const onDrop = (e: React.DragEvent<HTMLDivElement>, estado: Estado) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text");
    setMateriales((prev) => prev.map((m) => (m.id === id ? { ...m, estado } : m)));
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const crearMaterial = () => {
    if (nuevoNombre.trim() === "") return;
    const nuevo: Material = {
      id: Date.now().toString(),
      nombre: nuevoNombre.trim(),
      tipo: nuevoTipo,
      requiereArmado: nuevoArmado,
      compra: false,
      sede: false,
      sanMiguel: false,
      asignado: "",
      estado: nuevoTipo === "realizable" ? "por hacer" : "disponible",
    };
    setMateriales((prev) => [...prev, nuevo]);
    setNuevoNombre("");
    setNuevoArmado(false);
  };

  const materialesFiltrados =
    filtro === "todos"
      ? materiales
      : materiales.filter((m) => m.tipo === filtro);

  const actualizarCampo = (
    id: string,
    campo: keyof Material,
    valor: Material[keyof Material]
  ) => {
    setMateriales((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2 text-blue-900">
        <Kanban className="w-7 h-7" /> MaterialFlow
      </h1>

      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="tipoFiltro"
            checked={filtro === "todos"}
            onChange={() => setFiltro("todos")}
          />
          Todos
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="tipoFiltro"
            checked={filtro === "realizable"}
            onChange={() => setFiltro("realizable")}
          />
          Realizables
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="tipoFiltro"
            checked={filtro === "crudo"}
            onChange={() => setFiltro("crudo")}
          />
          Crudos
        </label>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Nombre del material"
          className="border rounded p-2 flex-1"
        />
        <select
          value={nuevoTipo}
          onChange={(e) => setNuevoTipo(e.target.value as "realizable" | "crudo")}
          className="border rounded p-2"
        >
          <option value="realizable">Realizable</option>
          <option value="crudo">Crudo</option>
        </select>
        {nuevoTipo === "realizable" && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={nuevoArmado}
              onChange={(e) => setNuevoArmado(e.target.checked)}
            />
            Requiere armado
          </label>
        )}
        <Button onClick={crearMaterial}>Agregar</Button>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {estados.map((estado) => (
          <div
            key={estado}
            onDrop={(e) => onDrop(e, estado)}
            onDragOver={onDragOver}
            className="bg-gray-100 rounded-lg p-4 min-h-[200px]"
          >
            <h2 className="text-lg font-semibold capitalize mb-2 text-blue-700">
              {estado}
            </h2>
            <div className="space-y-2">
              {materialesFiltrados
                .filter((m) => m.estado === estado)
                .map((m) => (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text", m.id)}
                    className="bg-white rounded p-3 shadow cursor-grab"
                  >
                    <div className="font-medium">{m.nombre}</div>
                    <div className="text-sm text-gray-600">
                      Tipo: {m.tipo} {m.tipo === "realizable" && m.requiereArmado ? "(armar)" : ""}
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={m.compra}
                          onChange={(e) => actualizarCampo(m.id, "compra", e.target.checked)}
                        />
                        Comprar
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={m.sede}
                          onChange={(e) => actualizarCampo(m.id, "sede", e.target.checked)}
                        />
                        Pedir en sede
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={m.sanMiguel}
                          onChange={(e) => actualizarCampo(m.id, "sanMiguel", e.target.checked)}
                        />
                        Llevar a San Miguel
                      </label>
                      <input
                        value={m.asignado}
                        onChange={(e) => actualizarCampo(m.id, "asignado", e.target.value)}
                        placeholder="Asignado a"
                        className="border rounded p-1 w-full"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
