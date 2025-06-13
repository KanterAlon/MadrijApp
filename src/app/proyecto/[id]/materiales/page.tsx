"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  FolderKanban,
  ShoppingCart,
  Building2,
  Tent,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  getMateriales,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  MaterialRow,
} from "@/lib/supabase/materiales";
import {
  getListas,
  addLista,
  ListaMaterialRow,
} from "@/lib/supabase/listas";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-client";

export default function MaterialesPage() {
  type Estado = "por hacer" | "en proceso" | "realizado";

  interface Material {
    id: string;
    listaId: string;
    nombre: string;
    descripcion: string;
    asignado: string;
    compra: boolean;
    sede: boolean;
    sanMiguel: boolean;
    armarEnSanMiguel: boolean;
    compraItems: string[];
    sedeItems: string[];
    sanMiguelItems: string[];
    estado: Estado;
  }

  const rowToMaterial = useCallback(
    (row: MaterialRow): Material => ({
      id: row.id,
      listaId: row.lista_id || "",
      nombre: row.nombre,
      descripcion: row.descripcion || "",
      asignado: row.asignado || "",
      compra: row.compra || false,
      sede: row.sede || false,
      sanMiguel: row.san_miguel || false,
      armarEnSanMiguel: row.armar_en_san_miguel || false,
      compraItems: row.compra_items || [],
      sedeItems: row.sede_items || [],
      sanMiguelItems: row.san_miguel_items || [],
      estado: (row.estado as Estado) || "por hacer",
    }),
    []
  );


  const { id: proyectoId } = useParams<{ id: string }>();
  const { user } = useUser();
  const estados: Estado[] = ["por hacer", "en proceso", "realizado"];

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [listas, setListas] = useState<ListaMaterialRow[]>([]);
  const [listaActual, setListaActual] = useState<string | null>(null);
  const [nuevaListaTitulo, setNuevaListaTitulo] = useState("");
  const [nuevaListaFecha, setNuevaListaFecha] = useState("");
  const [filtroAsignado, setFiltroAsignado] = useState("");

  const [madrijes, setMadrijes] = useState<{ clerk_id: string; nombre: string }[]>([]);
  const [nuevoCompraItem, setNuevoCompraItem] = useState("");
  const [nuevoSedeItem, setNuevoSedeItem] = useState("");
  const [nuevoSanMiguelItem, setNuevoSanMiguelItem] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [materialActual, setMaterialActual] = useState<Material | null>(null);

  useEffect(() => {
    if (!proyectoId) return;
    Promise.all([
      getMateriales(proyectoId),
      getMadrijimPorProyecto(proyectoId),
      getListas(proyectoId),
    ])
      .then(([mats, mads, lists]) => {
        setMateriales(mats.map(rowToMaterial));
        setMadrijes(mads);
        setListas(lists);
        if (lists.length > 0) setListaActual(lists[0].id);
      })
      .catch(() => {
        setMateriales([]);
        setMadrijes([]);
        setListas([]);
      });
  }, [proyectoId, rowToMaterial]);

  const crearMaterial = () => {
    if (!nuevoNombre.trim() || !listaActual) return;
    addMaterial(proyectoId, nuevoNombre.trim(), listaActual)
      .then((row) => {
        setMateriales((prev) => [...prev, rowToMaterial(row)]);
        setNuevoNombre("");
      })
      .catch(() => alert("Error creando material"));
  };

  const crearLista = () => {
    if (!nuevaListaTitulo.trim() || !nuevaListaFecha.trim()) return;
    addLista(proyectoId, nuevaListaTitulo.trim(), nuevaListaFecha)
      .then((row) => {
        setListas((prev) => [...prev, row]);
        setListaActual(row.id);
        setNuevaListaTitulo("");
        setNuevaListaFecha("");
      })
      .catch(() => alert("Error creando lista"));
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, estado: Estado) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text");
    setMateriales((prev) =>
      prev.map((m) => (m.id === id ? { ...m, estado } : m))
    );
    setMaterialActual((prev) =>
      prev && prev.id === id ? { ...prev, estado } : prev
    );
    updateMaterial(id, { estado } as Partial<MaterialRow>).catch(() =>
      console.error("Error cambiando estado")
    );
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const actualizarMaterial = (
    id: string,
    campo: keyof Material,
    valor: Material[keyof Material]
  ) => {
    setMateriales((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m))
    );
    setMaterialActual((prev) =>
      prev && prev.id === id ? { ...prev, [campo]: valor } : prev
    );
    const map: Record<keyof Material, keyof MaterialRow> = {
      id: "id",
      listaId: "lista_id",
      nombre: "nombre",
      descripcion: "descripcion",
      asignado: "asignado",
      compra: "compra",
      sede: "sede",
      sanMiguel: "san_miguel",
      armarEnSanMiguel: "armar_en_san_miguel",
      compraItems: "compra_items",
      sedeItems: "sede_items",
      sanMiguelItems: "san_miguel_items",
      estado: "estado",
    };
    updateMaterial(id, { [map[campo]]: valor } as Partial<MaterialRow>).catch(() =>
      console.error("Error actualizando material")
    );
  };

  const eliminarMaterial = (id: string) => {
    if (!confirm("¿Eliminar material?")) return;
    deleteMaterial(id)
      .then(() => {
        setMateriales((prev) => prev.filter((m) => m.id !== id));
        setSheetOpen(false);
        setMaterialActual(null);
      })
      .catch(() => alert("Error eliminando material"));
  };

  const agregarItemLista = (
    mat: Material,
    campo: "compraItems" | "sedeItems" | "sanMiguelItems",
    nuevo: string
  ) => {
    if (!nuevo.trim()) return;
    const lista = [...mat[campo], nuevo.trim()];
    actualizarMaterial(mat.id, campo, lista);
    if (campo === "compraItems") actualizarMaterial(mat.id, "compra", lista.length > 0);
    if (campo === "sedeItems") actualizarMaterial(mat.id, "sede", lista.length > 0);
    if (campo === "sanMiguelItems") {
      actualizarMaterial(mat.id, "sanMiguel", lista.length > 0);
      actualizarMaterial(mat.id, "armarEnSanMiguel", lista.length > 0);
    }
  };

  const quitarItemLista = (
    mat: Material,
    campo: "compraItems" | "sedeItems" | "sanMiguelItems",
    idx: number
  ) => {
    const lista = mat[campo].filter((_, i) => i !== idx);
    actualizarMaterial(mat.id, campo, lista);
    if (campo === "compraItems") actualizarMaterial(mat.id, "compra", lista.length > 0);
    if (campo === "sedeItems") actualizarMaterial(mat.id, "sede", lista.length > 0);
    if (campo === "sanMiguelItems") {
      const flag = lista.length > 0;
      actualizarMaterial(mat.id, "sanMiguel", flag);
      actualizarMaterial(mat.id, "armarEnSanMiguel", flag);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2 text-blue-900">
        <FolderKanban className="w-7 h-7" /> organización de materiales
      </h1>
      <div className="flex flex-wrap gap-2 items-end">
        <select
          value={listaActual || ""}
          onChange={(e) => setListaActual(e.target.value)}
          className="border rounded p-2"
        >
          {listas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.titulo} - {l.fecha}
            </option>
          ))}
        </select>
        <input
          value={nuevaListaTitulo}
          onChange={(e) => setNuevaListaTitulo(e.target.value)}
          placeholder="Título"
          className="border rounded p-2"
        />
        <input
          type="date"
          value={nuevaListaFecha}
          onChange={(e) => setNuevaListaFecha(e.target.value)}
          className="border rounded p-2"
        />
        <Button onClick={crearLista}>Crear lista</Button>
      </div>

      {/* Cosas para hacer */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-blue-800">Cosas para hacer</h2>
        <div className="flex gap-2 items-end">
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nuevo material"
            className="border rounded p-2 flex-1"
          />
          <Button onClick={crearMaterial}>Agregar</Button>
          <select
            value={filtroAsignado}
            onChange={(e) => setFiltroAsignado(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Todos</option>
            {user && (
              <option value={user.fullName || ""}>Mis tareas</option>
            )}
            {madrijes.map((m) => (
              <option key={m.clerk_id} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {estados.map((estado) => (
            <div
              key={estado}
              onDrop={(e) => onDrop(e, estado)}
              onDragOver={onDragOver}
              className="bg-gray-100 rounded-lg p-4 min-h-[200px]"
            >
              <h3 className="text-lg font-semibold capitalize mb-2 text-blue-700">
                {estado}
              </h3>
              <div className="space-y-2">
                {materiales
                  .filter((m) => m.estado === estado)
                  .filter((m) => m.listaId === (listaActual || m.listaId))
                  .filter((m) => !filtroAsignado || m.asignado === filtroAsignado)
                  .map((m) => (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text", m.id)}
                      onClick={() => {
                        setMaterialActual(m);
                        setSheetOpen(true);
                      }}
                      className="bg-white rounded p-3 shadow cursor-pointer"
                    >
                      <div className="font-medium">{m.nombre}</div>
                      <p className="text-xs text-gray-600">
                        {m.asignado || "Sin asignar"}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {m.compraItems.length > 0 && (
                          <ShoppingCart className="w-4 h-4 text-gray-500" />
                        )}
                        {m.sedeItems.length > 0 && (
                          <Building2 className="w-4 h-4 text-gray-500" />
                        )}
                        {m.sanMiguelItems.length > 0 && (
                          <Tent className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </div>
                  ))}
                {materiales
                  .filter((m) => m.estado === estado)
                  .filter((m) => m.listaId === (listaActual || m.listaId))
                  .filter((m) => !filtroAsignado || m.asignado === filtroAsignado)
                  .length === 0 && (
                  <p className="text-sm text-gray-500">Sin materiales</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cosas a comprar */}
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold text-blue-800">Cosas a comprar</h2>
        <div className="space-y-1">
          {materiales
            .filter((m) => m.listaId === (listaActual || m.listaId))
            .filter((m) => m.compraItems.length > 0)
            .length === 0 && (
            <p className="text-sm text-gray-500">Sin compras</p>
          )}
          {materiales
            .filter((m) => m.listaId === (listaActual || m.listaId))
            .filter((m) => m.compraItems.length > 0)
            .map((m) =>
              m.compraItems.map((item, idx) => (
                <div
                  key={`${m.id}-c-${idx}`}
                  onClick={() => {
                    setMaterialActual(m);
                    setSheetOpen(true);
                  }}
                  className="cursor-pointer hover:underline"
                >
                  {item}{" "}
                  <span className="text-xs text-gray-600">
                    ({m.nombre} - {m.asignado || "sin madrij"})
                  </span>
                </div>
              ))
            )}
        </div>
      </section>

      {/* Cosas para retirar en la sede */}
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold text-blue-800">
          Cosas para retirar en la sede
        </h2>
        <div className="space-y-1">
          {materiales
            .filter((m) => m.listaId === (listaActual || m.listaId))
            .filter((m) => m.sedeItems.length > 0)
            .length === 0 && (
            <p className="text-sm text-gray-500">Sin retiros</p>
          )}
          {materiales
            .filter((m) => m.listaId === (listaActual || m.listaId))
            .filter((m) => m.sedeItems.length > 0)
            .map((m) =>
              m.sedeItems.map((item, idx) => (
                <div
                  key={`${m.id}-s-${idx}`}
                  onClick={() => {
                    setMaterialActual(m);
                    setSheetOpen(true);
                  }}
                  className="cursor-pointer hover:underline"
                >
                  {item}{" "}
                  <span className="text-xs text-gray-600">
                    ({m.nombre} - {m.asignado || "sin madrij"})
                  </span>
                </div>
              ))
            )}
        </div>
      </section>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setMaterialActual(null);
          setSheetOpen(open);
        }}
      >
        <SheetContent className="w-80 sm:w-96">
          {materialActual && (
            <div className="flex flex-col h-full">
              <SheetHeader>
                <SheetTitle>Editar material</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-3 p-4">
                <input
                  value={materialActual.nombre}
                  onChange={(e) =>
                    actualizarMaterial(materialActual.id, "nombre", e.target.value)
                  }
                  className="border rounded p-2 w-full"
                />
                <textarea
                  value={materialActual.descripcion}
                  onChange={(e) =>
                    actualizarMaterial(
                      materialActual.id,
                      "descripcion",
                      e.target.value
                    )
                  }
                  className="border rounded p-2 w-full"
                  placeholder="Descripción"
                />
                <details className="border rounded p-2">
                  <summary className="cursor-pointer">Agregar elementos</summary>
                  <div className="mt-2 space-y-2">
                    <details className="border rounded p-2">
                      <summary className="cursor-pointer flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" /> Compras necesarias
                      </summary>
                      <div className="mt-2 space-y-1">
                        {materialActual.compraItems.map((c, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="flex-1 text-sm">{c}</span>
                            <button
                              onClick={() => quitarItemLista(materialActual, "compraItems", idx)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            value={nuevoCompraItem}
                            onChange={(e) => setNuevoCompraItem(e.target.value)}
                            className="border rounded p-1 flex-1 text-sm"
                            placeholder="Nueva compra"
                          />
                          <Button
                            onClick={() => {
                              agregarItemLista(materialActual, "compraItems", nuevoCompraItem);
                              setNuevoCompraItem("");
                            }}
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </details>

                    <details className="border rounded p-2">
                      <summary className="cursor-pointer flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Retirar de la sede
                      </summary>
                      <div className="mt-2 space-y-1">
                        {materialActual.sedeItems.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="flex-1 text-sm">{s}</span>
                            <button
                              onClick={() => quitarItemLista(materialActual, "sedeItems", idx)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            value={nuevoSedeItem}
                            onChange={(e) => setNuevoSedeItem(e.target.value)}
                            className="border rounded p-1 flex-1 text-sm"
                            placeholder="Nuevo item"
                          />
                          <Button
                            onClick={() => {
                              agregarItemLista(materialActual, "sedeItems", nuevoSedeItem);
                              setNuevoSedeItem("");
                            }}
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </details>

                    <details className="border rounded p-2">
                      <summary className="cursor-pointer flex items-center gap-2">
                        <Tent className="w-4 h-4" /> Material en San Miguel
                      </summary>
                      <div className="mt-2 space-y-1">
                        {materialActual.sanMiguelItems.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="flex-1 text-sm">{s}</span>
                            <button
                              onClick={() => quitarItemLista(materialActual, "sanMiguelItems", idx)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            value={nuevoSanMiguelItem}
                            onChange={(e) => setNuevoSanMiguelItem(e.target.value)}
                            className="border rounded p-1 flex-1 text-sm"
                            placeholder="Nuevo item"
                          />
                          <Button
                            onClick={() => {
                              agregarItemLista(materialActual, "sanMiguelItems", nuevoSanMiguelItem);
                              setNuevoSanMiguelItem("");
                            }}
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </details>
                  </div>
                </details>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={materialActual.armarEnSanMiguel}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "armarEnSanMiguel",
                        e.target.checked,
                      )
                    }
                  />
                  Terminar en San Miguel
                </label>

                <label className="flex items-center gap-2">
                  <span>Asignado a:</span>
                  <select
                    value={materialActual.asignado}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "asignado",
                        e.target.value
                      )
                    }
                    className="border rounded p-1 flex-1"
                  >
                    <option value="">Sin asignar</option>
                    {madrijes.map((m) => (
                      <option key={m.clerk_id} value={m.nombre}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <SheetFooter>
                <div className="flex w-full gap-2">
                  <Button
                    variant="danger"
                    onClick={() => eliminarMaterial(materialActual.id)}
                    className="flex-1"
                  >
                    Eliminar
                  </Button>
                  <SheetClose asChild>
                    <Button variant="secondary" className="flex-1">
                      Cerrar
                    </Button>
                  </SheetClose>
                </div>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
