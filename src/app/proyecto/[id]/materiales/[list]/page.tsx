"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FolderKanban,
  ShoppingCart,
  Building2,
  Tent,
  Trash2,
  Plus,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Button from "@/components/ui/button";
import DiagonalToggle from "@/components/ui/diagonal-toggle";
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
  addMaterialEnLista,
  updateMaterial,
  deleteMaterial,
  deleteMaterialList,
  MaterialRow,
} from "@/lib/supabase/materiales";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-client";
import { showError, confirmDialog } from "@/lib/alerts";

export default function MaterialesPage() {
  type Estado = "por hacer" | "en proceso" | "realizado";

  interface Material {
    id: string;
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


  const { id: proyectoId, list } = useParams<{ id: string; list: string }>();
  const router = useRouter();
  const estados: Estado[] = ["por hacer", "en proceso", "realizado"];

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");

  const [madrijes, setMadrijes] = useState<{ clerk_id: string; nombre: string }[]>([]);
  const [nuevoItemGeneral, setNuevoItemGeneral] = useState("");
  const [tipoNuevoItem, setTipoNuevoItem] = useState<"compra" | "sede" | "sanMiguel">("compra");
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [materialActual, setMaterialActual] = useState<Material | null>(null);
  const [filtroAsignado, setFiltroAsignado] = useState("");

  useEffect(() => {
    if (!proyectoId || !list) return;
    Promise.all([getMateriales(proyectoId, list), getMadrijimPorProyecto(proyectoId)])
      .then(([mats, mads]) => {
        const convM = mats.map(rowToMaterial);
        setMateriales(convM);
        setMadrijes(mads);
      })
      .catch(() => {
        setMateriales([]);
        setMadrijes([]);
      });
  }, [proyectoId, list, rowToMaterial]);

  const crearMaterial = () => {
    if (!nuevoNombre.trim() || !list) return;
    addMaterialEnLista(list, nuevoNombre.trim(), proyectoId)
      .then((row) => {
        setMateriales((prev) => [...prev, rowToMaterial(row)]);
        setNuevoNombre("");
      })
      .catch(() => showError("Error creando material"));
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


  const eliminarMaterial = async (id: string) => {
    if (!(await confirmDialog("¿Eliminar material?"))) return;
    deleteMaterial(id)
      .then(() => {
        setMateriales((prev) => prev.filter((m) => m.id !== id));
        setSheetOpen(false);
        setMaterialActual(null);
      })
      .catch(() => showError("Error eliminando material"));
  };

  const eliminarLista = async () => {
    if (!list) return;
    if (!(await confirmDialog("¿Eliminar lista?"))) return;
    deleteMaterialList(list)
      .then(() => router.push("../"))
      .catch(() => showError("Error eliminando lista"));
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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-blue-900">
          <FolderKanban className="w-7 h-7" /> Organización de Materiales
        </h1>
        <Button variant="danger" onClick={eliminarLista}>Eliminar lista</Button>
      </div>

      {/* Cosas para hacer */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-blue-800">Cosas para hacer</h2>
        <div className="flex gap-2">
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nuevo material"
            className="border rounded p-2 flex-1"
          />
          <Button onClick={crearMaterial}>Agregar</Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          <label htmlFor="filtroAsignado" className="text-sm text-gray-700">
            Ver de:
          </label>
          <select
            id="filtroAsignado"
            value={filtroAsignado}
            onChange={(e) => setFiltroAsignado(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Todos</option>
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
                  .filter(
                    (m) =>
                      m.estado === estado &&
                      (!filtroAsignado || m.asignado === filtroAsignado)
                  )
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
                      <div className="text-xs text-gray-600">{m.asignado || "Sin asignar"}</div>
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
                {materiales.filter(
                  (m) =>
                    m.estado === estado &&
                    (!filtroAsignado || m.asignado === filtroAsignado)
                ).length === 0 && (
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
          {materiales.filter((m) => m.compraItems.length > 0).length === 0 && (
            <p className="text-sm text-gray-500">Sin compras</p>
          )}
          {materiales
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
          {materiales.filter((m) => m.sedeItems.length > 0).length === 0 && (
            <p className="text-sm text-gray-500">Sin retiros</p>
          )}
          {materiales
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
                <div>
                  <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenu.Trigger asChild>
                      <Button
                        variant="secondary"
                        className="flex items-center gap-1 mb-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Faltan materiales</span>
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                      align="end"
                      className="z-20 w-48 rounded border bg-white shadow focus:outline-none"
                    >
                      <DropdownMenu.Label className="px-2 py-1 text-sm font-medium text-gray-600">
                        ¿Qué necesitás?
                      </DropdownMenu.Label>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 p-2 text-sm outline-none focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("compra");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <ShoppingCart className="w-4 h-4" /> Comprar
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 p-2 text-sm outline-none focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("sede");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Building2 className="w-4 h-4" /> Retirar en sede
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 p-2 text-sm outline-none focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("sanMiguel");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Tent className="w-4 h-4" /> Buscar en San Miguel
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                  {mostrarAgregar && (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={nuevoItemGeneral}
                        onChange={(e) => setNuevoItemGeneral(e.target.value)}
                        className="border rounded p-1 flex-1 text-sm"
                        placeholder="Nuevo item"
                      />
                      <Button
                        onClick={() => {
                          const campo: "compraItems" | "sedeItems" | "sanMiguelItems" =
                            tipoNuevoItem === "compra"
                              ? "compraItems"
                              : tipoNuevoItem === "sede"
                              ? "sedeItems"
                              : "sanMiguelItems";
                          agregarItemLista(materialActual, campo, nuevoItemGeneral);
                          setNuevoItemGeneral("");
                          setMostrarAgregar(false);
                        }}
                      >
                        Agregar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setMostrarAgregar(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
                {materialActual.compraItems.length > 0 && (
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
                    </div>
                  </details>
                )}

                {materialActual.sedeItems.length > 0 && (
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
                    </div>
                  </details>
                )}

                {materialActual.sanMiguelItems.length > 0 && (
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
                    </div>
                  </details>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <span>Se termina en</span>
                  <DiagonalToggle
                    value={materialActual.armarEnSanMiguel ? "sanMiguel" : "capital"}
                    onChange={(v) =>
                      actualizarMaterial(
                        materialActual.id,
                        "armarEnSanMiguel",
                        v === "sanMiguel"
                      )
                    }
                  />
                </div>

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
