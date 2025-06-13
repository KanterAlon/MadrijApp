"use client";

import { useState } from "react";
import {
  Kanban,
  ShoppingCart,
  Building2,
  Tent,
  User,
  Hammer,
} from "lucide-react";
import Button from "@/components/ui/button";

export default function MaterialesPage() {
  type Estado =
    | "por hacer"
    | "en proceso"
    | "realizado"
    | "disponible"
    | "a retirar";

  type SubEstado =
    | "falta comprar materiales"
    | "hay que pasar por la sede"
    | "se arma en San Miguel"
    | "nadie lo empezó"
    | "ya está en proceso";

  const subEstados: SubEstado[] = [
    "falta comprar materiales",
    "hay que pasar por la sede",
    "se arma en San Miguel",
    "nadie lo empezó",
    "ya está en proceso",
  ];

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
    subestado: SubEstado | null;
  };

  const estados: Estado[] = [
    "por hacer",
    "en proceso",
    "realizado",
    "disponible",
    "a retirar",
  ];

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<"realizable" | "crudo">("realizable");
  const [nuevoArmado, setNuevoArmado] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | "realizable" | "crudo">("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | Estado>("todos");
  const [personaFiltro, setPersonaFiltro] = useState("");
  const [necesidadFiltro, setNecesidadFiltro] = useState<
    "todas" | "comprar" | "sede" | "sanMiguel"
  >("todas");

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
      subestado:
        nuevoTipo === "realizable" ? "nadie lo empezó" : null,
    };
    setMateriales((prev) => [...prev, nuevo]);
    setNuevoNombre("");
    setNuevoArmado(false);
  };

  let materialesFiltrados = [...materiales];
  if (filtro !== "todos") {
    materialesFiltrados = materialesFiltrados.filter((m) => m.tipo === filtro);
  }
  if (estadoFiltro !== "todos") {
    materialesFiltrados = materialesFiltrados.filter((m) => m.estado === estadoFiltro);
  }
  if (personaFiltro.trim() !== "") {
    materialesFiltrados = materialesFiltrados.filter((m) =>
      m.asignado.toLowerCase().includes(personaFiltro.trim().toLowerCase())
    );
  }
  if (necesidadFiltro === "comprar") {
    materialesFiltrados = materialesFiltrados.filter((m) => m.compra);
  } else if (necesidadFiltro === "sede") {
    materialesFiltrados = materialesFiltrados.filter((m) => m.sede);
  } else if (necesidadFiltro === "sanMiguel") {
    materialesFiltrados = materialesFiltrados.filter((m) => m.sanMiguel);
  }

  const actualizarCampo = (
    id: string,
    campo: keyof Material,
    valor: Material[keyof Material]
  ) => {
    setMateriales((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
  };

  const compras = materiales.filter((m) => m.compra);
  const sedeList = materiales.filter((m) => m.sede);
  const sanMiguelList = materiales.filter((m) => m.sanMiguel);
  const sinAsignar = materiales.filter((m) => !m.asignado.trim());
  const disponiblesCrudos = materiales.filter(
    (m) => m.tipo === "crudo" && m.estado === "disponible"
  );

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

      <div className="mb-4 flex flex-wrap gap-4">
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as Estado | "todos")}
          className="border rounded p-2"
        >
          <option value="todos">Todos los estados</option>
          {estados.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <input
          value={personaFiltro}
          onChange={(e) => setPersonaFiltro(e.target.value)}
          placeholder="Filtrar por persona"
          className="border rounded p-2"
        />
        <select
          value={necesidadFiltro}
          onChange={(e) =>
            setNecesidadFiltro(
              e.target.value as "todas" | "comprar" | "sede" | "sanMiguel"
            )
          }
          className="border rounded p-2"
        >
          <option value="todas">Todas las necesidades</option>
          <option value="comprar">Solo para comprar</option>
          <option value="sede">Solo de la sede</option>
          <option value="sanMiguel">Solo San Miguel</option>
        </select>
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
                          onChange={(e) =>
                            actualizarCampo(m.id, "compra", e.target.checked)
                          }
                        />
                        <ShoppingCart className="w-4 h-4" /> Comprar
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={m.sede}
                          onChange={(e) =>
                            actualizarCampo(m.id, "sede", e.target.checked)
                          }
                        />
                        <Building2 className="w-4 h-4" /> Pedir en sede
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={m.sanMiguel}
                          onChange={(e) =>
                            actualizarCampo(m.id, "sanMiguel", e.target.checked)
                          }
                        />
                        <Tent className="w-4 h-4" /> Llevar a San Miguel
                      </label>
                      <label className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <input
                          value={m.asignado}
                          onChange={(e) =>
                            actualizarCampo(m.id, "asignado", e.target.value)
                          }
                          placeholder="Asignado a"
                          className="border rounded p-1 flex-1"
                        />
                      </label>
                      {m.tipo === "realizable" && (
                        <div className="space-y-1">
                          <span className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs">
                            {m.subestado}
                          </span>
                          <select
                            value={m.subestado ?? subEstados[3]}
                            onChange={(e) =>
                              actualizarCampo(m.id, "subestado", e.target.value as SubEstado)
                            }
                            className="border rounded p-1 w-full text-xs"
                          >
                            {subEstados.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {materialesFiltrados.filter((m) => m.estado === estado).length === 0 && (
                <p className="text-sm text-gray-500">Sin materiales</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        <h2 className="text-2xl font-bold text-blue-800">Listas automáticas</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Lista de compras
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {compras.map((m) => (
                <li key={m.id}>{m.nombre}</li>
              ))}
              {compras.length === 0 && (
                <li className="text-gray-500">Sin items</li>
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Cosas a retirar de la sede
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {sedeList.map((m) => (
                <li key={m.id}>{m.nombre}</li>
              ))}
              {sedeList.length === 0 && (
                <li className="text-gray-500">Sin items</li>
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <Tent className="w-4 h-4" /> Llevar a San Miguel
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {sanMiguelList.map((m) => (
                <li key={m.id}>{m.nombre}</li>
              ))}
              {sanMiguelList.length === 0 && (
                <li className="text-gray-500">Sin items</li>
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" /> Materiales sin asignar
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {sinAsignar.map((m) => (
                <li key={m.id}>{m.nombre}</li>
              ))}
              {sinAsignar.length === 0 && (
                <li className="text-gray-500">Sin items</li>
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <Hammer className="w-4 h-4" /> Materiales no realizables disponibles
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {disponiblesCrudos.map((m) => (
                <li key={m.id}>{m.nombre}</li>
              ))}
              {disponiblesCrudos.length === 0 && (
                <li className="text-gray-500">Sin items</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
