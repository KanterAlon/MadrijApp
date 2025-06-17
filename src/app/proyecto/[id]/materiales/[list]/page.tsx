"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import useMediaQuery from "@/hooks/useMediaQuery";
import {
  FolderKanban,
  ShoppingCart,
  Building2,
  Tent,
  Warehouse,
  Laptop,
  Users,
  Handshake,
  House,
  Box,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Button from "@/components/ui/button";
import BackLink from "@/components/ui/back-link";
import DiagonalToggle from "@/components/ui/diagonal-toggle";
import fuzzysort from "fuzzysort";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { toast } from "react-hot-toast";
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
import Loader from "@/components/ui/loader";

export default function MaterialesPage() {
  type Estado = "por hacer" | "en proceso" | "realizado";

  interface Item {
    nombre: string;
    cantidad: number;
  }

  interface Material {
    id: string;
    nombre: string;
    descripcion: string;
    asignado: string;
    compra: boolean;
    sede: boolean;
    sanMiguel: boolean;
    armarEnSanMiguel: boolean;
    compraItems: Item[];
    compraOnlineItems: Item[];
    sedeItems: Item[];
    depositoItems: Item[];
    sanMiguelItems: Item[];
    kvutzaItems: Item[];
    alquilerItems: Item[];
    propiosItems: Item[];
    otrosItems: Item[];
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
      compraOnlineItems: row.compra_online_items || [],
      sedeItems: row.sede_items || [],
      depositoItems: row.deposito_items || [],
      sanMiguelItems: row.san_miguel_items || [],
      kvutzaItems: row.kvutza_items || [],
      alquilerItems: row.alquiler_items || [],
      propiosItems: row.propios_items || [],
      otrosItems: row.otros_items || [],
      estado: (row.estado as Estado) || "por hacer",
    }),
    []
  );


  const { id: proyectoId, list } = useParams<{ id: string; list: string }>();
  const router = useRouter();
  const estados: Estado[] = ["por hacer", "en proceso", "realizado"];

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPorEstado, setNuevoPorEstado] = useState<Record<Estado, string>>({
    "por hacer": "",
    "en proceso": "",
    realizado: "",
  });

  const [madrijes, setMadrijes] = useState<{ clerk_id: string; nombre: string }[]>([]);
  const [nuevoItemGeneral, setNuevoItemGeneral] = useState("");
  const [cantidadNuevoItem, setCantidadNuevoItem] = useState(1);
  const [tipoNuevoItem, setTipoNuevoItem] =
    useState<
      | "compra"
      | "compraOnline"
      | "sede"
      | "deposito"
      | "sanMiguel"
      | "kvutza"
      | "alquiler"
      | "propios"
      | "otros"
    >("compra");
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [materialActual, setMaterialActual] = useState<Material | null>(null);
  const [filtroAsignado, setFiltroAsignado] = useState("");

  const isDesktop = useMediaQuery("(min-width: 640px)");

  const resumen = useMemo(() => {
    const campos = [
      "compraItems",
      "compraOnlineItems",
      "sedeItems",
      "depositoItems",
      "sanMiguelItems",
      "kvutzaItems",
      "alquilerItems",
      "propiosItems",
      "otrosItems",
    ] as const;
    const items: Item[] = [];
    materiales.forEach((m) => {
      campos.forEach((c) => {
        items.push(...m[c]);
      });
    });
    const colores = [
      "blanco",
      "negro",
      "rojo",
      "azul",
      "verde",
      "amarillo",
      "rosa",
      "morado",
      "gris",
    ];
    const normalizar = (nombre: string) => {
      const clean = nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z\s]/g, "");
      let color = "";
      let best = 1000;
      colores.forEach((c) => {
        const res = fuzzysort.single(c, clean);
        if (res && res.score < best) {
          best = res.score;
          color = c;
        }
      });
      if (best > 2) color = "";
      let base = clean.replace(/cartulinas?/, "cartulinas");
      base = base.replace(color, "").replace(/\bcolor\b/, "").trim();
      return { base: base || clean, color };
    };
    const out: Record<string, Record<string, number>> = {};
    items.forEach((it) => {
      const { base, color } = normalizar(it.nombre);
      if (!out[base]) out[base] = {};
      const key = color || "";
      out[base][key] = (out[base][key] || 0) + it.cantidad;
    });
    return out;
  }, [materiales]);
  useEffect(() => {
    if (!proyectoId || !list) return;
    setLoading(true);
    Promise.all([getMateriales(proyectoId, list), getMadrijimPorProyecto(proyectoId)])
      .then(([mats, mads]) => {
        const convM = mats.map(rowToMaterial);
        setMateriales(convM);
        setMadrijes(mads);
      })
      .catch(() => {
        setMateriales([]);
        setMadrijes([]);
      })
      .finally(() => setLoading(false));
  }, [proyectoId, list, rowToMaterial]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="h-6 w-6" />
      </div>
    );
  }

  const crearMaterial = () => {
    if (!nuevoNombre.trim() || !list) return;
    addMaterialEnLista(list, nuevoNombre.trim(), proyectoId)
      .then((row) => {
        setMateriales((prev) => [...prev, rowToMaterial(row)]);
        setNuevoNombre("");
        toast.success("Material creado");
      })
      .catch(() => showError("Error creando material"));
  };

  const crearMaterialEnEstado = (estado: Estado) => {
    const nombre = nuevoPorEstado[estado].trim();
    if (!nombre || !list) return;
    addMaterialEnLista(list, nombre, proyectoId, estado)
      .then((row) => {
        setMateriales((prev) => [...prev, rowToMaterial(row)]);
        setNuevoPorEstado((prev) => ({ ...prev, [estado]: "" }));
        toast.success("Material creado");
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
      compraOnlineItems: "compra_online_items",
      sedeItems: "sede_items",
      depositoItems: "deposito_items",
      sanMiguelItems: "san_miguel_items",
      kvutzaItems: "kvutza_items",
      alquilerItems: "alquiler_items",
      propiosItems: "propios_items",
      otrosItems: "otros_items",
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
        toast.success("Material eliminado");
      })
      .catch(() => showError("Error eliminando material"));
  };

  const eliminarLista = async () => {
    if (!list) return;
    if (!(await confirmDialog("¿Eliminar lista?"))) return;
    deleteMaterialList(list)
      .then(() => {
        toast.success("Lista eliminada");
        router.push("../");
      })
      .catch(() => showError("Error eliminando lista"));
  };


  const agregarItemLista = (
    mat: Material,
    campo:
      | "compraItems"
      | "compraOnlineItems"
      | "sedeItems"
      | "depositoItems"
      | "sanMiguelItems"
      | "kvutzaItems"
      | "alquilerItems"
      | "propiosItems"
      | "otrosItems",
    nuevo: Item
  ) => {
    if (!nuevo.nombre.trim() || nuevo.cantidad <= 0) return;
    const lista = [...mat[campo], nuevo];
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
    campo:
      | "compraItems"
      | "compraOnlineItems"
      | "sedeItems"
      | "depositoItems"
      | "sanMiguelItems"
      | "kvutzaItems"
      | "alquilerItems"
      | "propiosItems"
      | "otrosItems",
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

  const compras = materiales.filter((m) => m.compraItems.length > 0);
  const comprasOnline = materiales.filter((m) => m.compraOnlineItems.length > 0);
  const retiros = materiales.filter((m) => m.sedeItems.length > 0);
  const deposito = materiales.filter((m) => m.depositoItems.length > 0);
  const sanMiguelPend = materiales.filter((m) => m.sanMiguelItems.length > 0);
  const kvutza = materiales.filter((m) => m.kvutzaItems.length > 0);
  const alquiler = materiales.filter((m) => m.alquilerItems.length > 0);
  const propios = materiales.filter((m) => m.propiosItems.length > 0);
  const otros = materiales.filter((m) => m.otrosItems.length > 0);

  return (
    <div className="space-y-8">
      <BackLink
        href={`/proyecto/${proyectoId}/materiales`}
        className="inline-flex"
      />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-blue-900">
          <FolderKanban className="w-7 h-7" /> Organización de Materiales
        </h1>
        <Button
          variant="danger"
          onClick={eliminarLista}
          icon={<Trash2 className="w-4 h-4" />}
        >
          Eliminar lista
        </Button>
      </div>

      {/* Cosas para hacer */}
      <section className="space-y-4">
        <div className="flex gap-2">
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nuevo material"
            className="border rounded p-2 flex-1"
          />
          <Button onClick={crearMaterial} icon={<Plus className="w-4 h-4" />}>
            Agregar
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b gap-2">
            <h2 className="text-2xl font-semibold text-blue-800">Organización de materiales</h2>
            <div className="flex items-center gap-2">
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
          </div>
          <div className="grid md:grid-cols-3 gap-4 p-4">
            {estados.map((estado) => {
              const mats = materiales.filter(
                (m) =>
                  m.estado === estado &&
                  (!filtroAsignado || m.asignado === filtroAsignado)
              );
              return (
                <div
                  key={estado}
                  onDrop={(e) => onDrop(e, estado)}
                  onDragOver={onDragOver}
                  className="bg-gray-100 rounded-lg p-4 min-h-[200px]"
                >
                  <h3 className="text-lg font-semibold capitalize mb-2 text-blue-700">
                    {mats.length} {estado}
                  </h3>
                  <div className="space-y-2">
                    {mats.map((m) => (
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
                    {mats.length === 0 && (
                      <p className="text-sm text-gray-500">Sin materiales</p>
                    )}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    value={nuevoPorEstado[estado]}
                    onChange={(e) =>
                      setNuevoPorEstado((prev) => ({
                        ...prev,
                        [estado]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && crearMaterialEnEstado(estado)
                    }
                    placeholder="Agregar material"
                    className="flex-1 bg-transparent border-b border-gray-300 focus:outline-none"
                  />
                  <button
                    onClick={() => crearMaterialEnEstado(estado)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
          </div>
        </div>
      </section>

      {/* Cosas a comprar */}
      {compras.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Cosas a comprar</h2>
          <div className="space-y-1">
            {compras.map((m) =>
              m.compraItems.map((item, idx) => (
                <label key={`${m.id}-c-${idx}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={() => quitarItemLista(m, "compraItems", idx)}
                  />
                  <span
                    onClick={() => {
                      setMaterialActual(m);
                      setSheetOpen(true);
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    {item.cantidad} {item.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      ({m.nombre} - {m.asignado || "sin madrij"})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </section>
      )}

      {/* Compras online */}
      {comprasOnline.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Comprar online</h2>
          <div className="space-y-1">
            {comprasOnline.map((m) =>
              m.compraOnlineItems.map((item, idx) => (
                <label key={`${m.id}-co-${idx}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={() => quitarItemLista(m, "compraOnlineItems", idx)}
                  />
                  <span
                    onClick={() => {
                      setMaterialActual(m);
                      setSheetOpen(true);
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    {item.cantidad} {item.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      ({m.nombre} - {m.asignado || "sin madrij"})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </section>
      )}

      {/* Cosas para retirar en la sede */}
      {retiros.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">
            Cosas para retirar en la sede
          </h2>
          <div className="space-y-1">
            {retiros.map((m) =>
              m.sedeItems.map((item, idx) => (
                <label key={`${m.id}-s-${idx}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={() => quitarItemLista(m, "sedeItems", idx)}
                  />
                  <span
                    onClick={() => {
                      setMaterialActual(m);
                      setSheetOpen(true);
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    {item.cantidad} {item.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      ({m.nombre} - {m.asignado || "sin madrij"})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </section>
      )}

      {/* Retirar del depósito */}
      {deposito.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Retirar del depósito</h2>
          <div className="space-y-1">
            {deposito.map((m) =>
              m.depositoItems.map((item, idx) => (
                <label key={`${m.id}-d-${idx}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={() => quitarItemLista(m, "depositoItems", idx)}
                  />
                  <span
                    onClick={() => {
                      setMaterialActual(m);
                      setSheetOpen(true);
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    {item.cantidad} {item.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      ({m.nombre} - {m.asignado || "sin madrij"})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </section>
      )}

      {/* Material en San Miguel */}
      {sanMiguelPend.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Material en San Miguel</h2>
          <div className="space-y-1">
            {sanMiguelPend.map((m) =>
              m.sanMiguelItems.map((item, idx) => (
                <label key={`${m.id}-sm-${idx}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={() => quitarItemLista(m, "sanMiguelItems", idx)}
                  />
                  <span
                    onClick={() => {
                      setMaterialActual(m);
                      setSheetOpen(true);
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    {item.cantidad} {item.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      ({m.nombre} - {m.asignado || "sin madrij"})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </section>
      )}

      {/* Pedir a otra kvutzá */}
      {kvutza.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Pedir a otra kvutzá</h2>
          <div className="space-y-1">
            {kvutza.map((m) =>
              m.kvutzaItems.map((item, idx) => (
                <label key={`${m.id}-k-${idx}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={() => quitarItemLista(m, "kvutzaItems", idx)}
                  />
                  <span
                    onClick={() => {
                      setMaterialActual(m);
                      setSheetOpen(true);
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    {item.cantidad} {item.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      ({m.nombre} - {m.asignado || "sin madrij"})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </section>
      )}

      {/* Material para alquilar */}
      {alquiler.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Material para alquilar</h2>
          <div className="space-y-1">
            {alquiler.map((m) =>
              m.alquilerItems.map((item, idx) => (
                <label key={`${m.id}-a-${idx}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={() => quitarItemLista(m, "alquilerItems", idx)}
                  />
                  <span
                    onClick={() => {
                      setMaterialActual(m);
                      setSheetOpen(true);
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    {item.cantidad} {item.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      ({m.nombre} - {m.asignado || "sin madrij"})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </section>
      )}

      {/* Llevar desde casa */}
      {propios.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Llevar desde casa</h2>
          <div className="space-y-1">
            {propios.map((m) =>
              m.propiosItems.map((item, idx) => (
                <label key={`${m.id}-p-${idx}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={() => quitarItemLista(m, "propiosItems", idx)}
                  />
                  <span
                    onClick={() => {
                      setMaterialActual(m);
                      setSheetOpen(true);
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    {item.cantidad} {item.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      ({m.nombre} - {m.asignado || "sin madrij"})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </section>
      )}

      {/* Otros materiales */}
      {otros.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Otros materiales</h2>
          <div className="space-y-1">
            {otros.map((m) =>
              m.otrosItems.map((item, idx) => (
                <label key={`${m.id}-o-${idx}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={() => quitarItemLista(m, "otrosItems", idx)}
                  />
                  <span
                    onClick={() => {
                      setMaterialActual(m);
                      setSheetOpen(true);
                    }}
                    className="cursor-pointer hover:underline"
                  >
                    {item.cantidad} {item.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      ({m.nombre} - {m.asignado || "sin madrij"})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </section>
      )}

      {Object.keys(resumen).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Resumen total</h2>
          <div className="space-y-1">
            {Object.entries(resumen).map(([nombre, colores]) => (
              <div key={nombre}>
                <span className="font-medium capitalize">{nombre}</span>
                <ul className="ml-4 list-disc">
                  {Object.entries(colores).map(([c, cantidad]) => (
                    <li key={c}>{cantidad} {c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <Sheet
        modal={false}
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setMaterialActual(null);
          setSheetOpen(open);
        }}
      >
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className="w-full sm:w-96 h-dvh"
        >
          {materialActual && (
            <div className="flex flex-col h-full">
              <SheetHeader>
                <SheetTitle>Editar material</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-3 p-4 pb-32 sm:pb-4">
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
                        className="mb-2 justify-start"
                        icon={<Plus className="w-4 h-4" />}
                      >
                        Faltan materiales
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                      align="start"
                      sideOffset={4}
                      className="z-20 w-52 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
                    >
                      <DropdownMenu.Label className="px-2 py-1 text-sm font-medium text-gray-600">
                        ¿Qué necesitás?
                      </DropdownMenu.Label>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("compra");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <ShoppingCart className="w-4 h-4" /> Comprar en comercio
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("compraOnline");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Laptop className="w-4 h-4" /> Comprar online
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("sede");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Building2 className="w-4 h-4" /> Retirar en sede
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("deposito");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Warehouse className="w-4 h-4" /> Retirar del depósito
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("sanMiguel");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Tent className="w-4 h-4" /> Buscar en San Miguel
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("kvutza");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Users className="w-4 h-4" /> Pedir a otra kvutzá
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("alquiler");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Handshake className="w-4 h-4" /> Alquilar
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("propios");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <House className="w-4 h-4" /> Llevar de casa
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("otros");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Box className="w-4 h-4" /> Otro
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                  {mostrarAgregar && (
                    <div className="flex flex-col gap-2 mt-2 sm:flex-row">
                      <input
                        type="number"
                        min={1}
                        value={cantidadNuevoItem}
                        onChange={(e) => setCantidadNuevoItem(Number(e.target.value))}
                        className="border rounded p-1 w-16 text-sm"
                        placeholder="Cant."
                      />
                      <input
                        value={nuevoItemGeneral}
                        onChange={(e) => setNuevoItemGeneral(e.target.value)}
                        className="border rounded p-1 flex-1 text-sm"
                        placeholder="Nuevo item"
                      />
                      <Button
                        className="w-full sm:flex-1"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => {
                          const campo =
                            tipoNuevoItem === "compra"
                              ? "compraItems"
                              : tipoNuevoItem === "compraOnline"
                              ? "compraOnlineItems"
                              : tipoNuevoItem === "sede"
                              ? "sedeItems"
                              : tipoNuevoItem === "deposito"
                              ? "depositoItems"
                              : tipoNuevoItem === "sanMiguel"
                              ? "sanMiguelItems"
                              : tipoNuevoItem === "kvutza"
                              ? "kvutzaItems"
                              : tipoNuevoItem === "alquiler"
                              ? "alquilerItems"
                              : tipoNuevoItem === "propios"
                              ? "propiosItems"
                              : "otrosItems";
                          agregarItemLista(materialActual, campo, {
                            nombre: nuevoItemGeneral,
                            cantidad: cantidadNuevoItem,
                          });
                          setNuevoItemGeneral("");
                          setCantidadNuevoItem(1);
                          setMostrarAgregar(false);
                        }}
                      >
                        Agregar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setMostrarAgregar(false)}
                        className="w-full sm:flex-1"
                        icon={<X className="w-4 h-4" />}
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
                          <span className="flex-1 text-sm">
                            {c.cantidad} {c.nombre}
                          </span>
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
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
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
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
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

                {materialActual.compraOnlineItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Laptop className="w-4 h-4" /> Compras online
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.compraOnlineItems.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {c.cantidad} {c.nombre}
                          </span>
                          <button
                            onClick={() => quitarItemLista(materialActual, "compraOnlineItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.depositoItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Warehouse className="w-4 h-4" /> Retiro del depósito
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.depositoItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => quitarItemLista(materialActual, "depositoItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.kvutzaItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Users className="w-4 h-4" /> Pedir a otra kvutzá
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.kvutzaItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => quitarItemLista(materialActual, "kvutzaItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.alquilerItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Handshake className="w-4 h-4" /> Material para alquilar
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.alquilerItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => quitarItemLista(materialActual, "alquilerItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.propiosItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <House className="w-4 h-4" /> Llevar desde casa
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.propiosItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => quitarItemLista(materialActual, "propiosItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.otrosItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Box className="w-4 h-4" /> Otros materiales
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.otrosItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => quitarItemLista(materialActual, "otrosItems", idx)}
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
                    disableCapital={materialActual.sanMiguelItems.length > 0}
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
                <div className="flex flex-col sm:flex-row w-full gap-2">
                  <Button
                    variant="danger"
                    onClick={() => eliminarMaterial(materialActual.id)}
                    className="flex-1"
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    Eliminar
                  </Button>
                  <SheetClose asChild>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      icon={<X className="w-4 h-4" />}
                    >
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
