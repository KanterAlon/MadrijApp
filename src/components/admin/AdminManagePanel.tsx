"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-hot-toast";
import removeAccents from "remove-accents";

import Button from "@/components/ui/button";
import Loader from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showError, confirmDialog } from "@/lib/alerts";
import type { SheetsData } from "@/lib/google/sheetData";

const inputStyles =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

const textareaStyles =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

type RolesResponse = { roles: string[] };

type AdminManageSummary = {
  supabase: {
    janijimActivos: number;
    madrijimActivos: number;
    gruposRegistrados: number;
    proyectosRegistrados: number;
    rolesActivos: number;
  };
};

type AdminManageResponse = {
  sheets: SheetsData;
  summary: AdminManageSummary;
};

function normaliseGroupKey(value: string) {
  return removeAccents(value).trim().toLowerCase();
}

function SectionLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
      {description ? <p className="text-sm text-blue-900/70">{description}</p> : null}
    </div>
  );
}

export function AdminManagePanel() {
  const { user } = useUser();
  const [roles, setRoles] = useState<string[] | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [data, setData] = useState<AdminManageResponse | null>(null);
  const [sheets, setSheets] = useState<SheetsData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isAdmin = useMemo(() => roles?.includes("admin") ?? false, [roles]);

  const hasChanges = useMemo(() => {
    if (!sheets || !data?.sheets) return false;
    return JSON.stringify(sheets) !== JSON.stringify(data.sheets);
  }, [sheets, data?.sheets]);

  useEffect(() => {
    if (!user) {
      setRoles(null);
      return;
    }
    setLoadingRoles(true);
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("No se pudieron obtener los roles del usuario");
        }
        return (await res.json()) as RolesResponse;
      })
      .then((payload) => setRoles(payload.roles))
      .catch((err) => {
        console.error("Error cargando roles", err);
        setRoles([]);
        showError("No se pudieron obtener los roles del usuario");
      })
      .finally(() => setLoadingRoles(false));
  }, [user]);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/manage");
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudieron cargar los datos administrativos");
      }
      const payload = (await res.json()) as AdminManageResponse;
      setData(payload);
      setSheets(payload.sheets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los datos administrativos";
      showError(message);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void fetchData();
    }
  }, [fetchData, isAdmin]);

  const updateMadrijField = (index: number, field: "nombre" | "email" | "grupoNombre", value: string) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const madrijes = [...prev.madrijes];
      const current = { ...madrijes[index] };
      current[field] = value;
        if (field === "grupoNombre") {
          current.grupoKey = normaliseGroupKey(value);
      }
      if (field === "email") {
        current.email = value.trim().toLowerCase();
      }
      madrijes[index] = current;
      return { ...prev, madrijes };
    });
  };

  const addMadrij = () => {
    setSheets((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        madrijes: [
          ...prev.madrijes,
          { email: "", nombre: "", grupoNombre: "", grupoKey: "" },
        ],
      };
    });
  };

  const removeMadrij = (index: number) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const madrijes = prev.madrijes.filter((_, i) => i !== index);
      return { ...prev, madrijes };
    });
  };

  const updateJanijField = (
    index: number,
    field: "nombre" | "grupoNombre" | "telMadre" | "telPadre",
    value: string,
  ) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const janijim = [...prev.janijim];
      const current = { ...janijim[index] };
      current[field] = value;
        if (field === "grupoNombre") {
          current.grupoKey = normaliseGroupKey(value);
      }
      if (field === "telMadre" || field === "telPadre") {
        current[field] = value.trim() || null;
      }
      janijim[index] = current;
      return { ...prev, janijim };
    });
  };

  const addJanij = () => {
    setSheets((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        janijim: [
          ...prev.janijim,
          { nombre: "", grupoNombre: "", grupoKey: "", telMadre: null, telPadre: null },
        ],
      };
    });
  };

  const removeJanij = (index: number) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const janijim = prev.janijim.filter((_, i) => i !== index);
      return { ...prev, janijim };
    });
  };

  const updateProyecto = (index: number, field: "nombre" | "grupos", value: string) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const proyectos = [...prev.proyectos];
      const current = { ...proyectos[index] };
      if (field === "nombre") {
        current.nombre = value;
      } else {
        current.grupos = value
          .split(/\n+/u)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
      proyectos[index] = current;
      return { ...prev, proyectos };
    });
  };

  const addProyecto = () => {
    setSheets((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        proyectos: [...prev.proyectos, { nombre: "", grupos: [] }],
      };
    });
  };

  const removeProyecto = (index: number) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const proyectos = prev.proyectos.filter((_, i) => i !== index);
      return { ...prev, proyectos };
    });
  };

  const updateCoordinador = (index: number, field: "nombre" | "email" | "proyectos", value: string) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const coordinadores = [...prev.coordinadores];
      const current = { ...coordinadores[index] };
      if (field === "proyectos") {
        current.proyectos = value
          .split(/\n+/u)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      } else if (field === "email") {
        current.email = value.trim().toLowerCase();
      } else {
        current.nombre = value;
      }
      coordinadores[index] = current;
      return { ...prev, coordinadores };
    });
  };

  const addCoordinador = () => {
    setSheets((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        coordinadores: [...prev.coordinadores, { nombre: "", email: "", proyectos: [] }],
      };
    });
  };

  const removeCoordinador = (index: number) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const coordinadores = prev.coordinadores.filter((_, i) => i !== index);
      return { ...prev, coordinadores };
    });
  };

  const updateRoleEntry = (
    type: "directores" | "admins",
    index: number,
    field: "nombre" | "email",
    value: string,
  ) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const list = [...prev[type]];
      const current = { ...list[index] };
      if (field === "email") {
        current.email = value.trim().toLowerCase();
      } else {
        current.nombre = value;
      }
      list[index] = current;
      return { ...prev, [type]: list };
    });
  };

  const addRoleEntry = (type: "directores" | "admins") => {
    setSheets((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [type]: [...prev[type], { nombre: "", email: "" }],
      };
    });
  };

  const removeRoleEntry = (type: "directores" | "admins", index: number) => {
    setSheets((prev) => {
      if (!prev) return prev;
      const list = prev[type].filter((_, i) => i !== index);
      return { ...prev, [type]: list };
    });
  };

  const saveChanges = async () => {
    if (!sheets) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheets }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudieron guardar los cambios");
      }
      void (await res.json());
      toast.success("Guardamos los cambios en la hoja y en Supabase");
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron guardar los cambios";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const resetDatabase = async () => {
    const confirmed = await confirmDialog(
      "¿Seguro que querés limpiar la base y reconstruirla con la hoja actual? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudo reinicializar la base");
      }
      void (await res.json());
      toast.success("Reinicializamos la base con los datos de la hoja");
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo reinicializar la base";
      showError(message);
    } finally {
      setResetting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="h-6 w-6" />
      </div>
    );
  }

  if (loadingRoles) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="h-6 w-6" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-amber-900">Acceso restringido</h1>
        <p className="mt-2 text-amber-900">
          Esta sección es exclusiva para el administrador de la aplicación. Si necesitás actualizar la hoja institucional,
          solicitá acceso al equipo nacional.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-blue-900">Gestión institucional</h1>
        <p className="text-sm text-blue-900/70">
          Modificá la hoja institucional, sincronizá los cambios con Supabase y controlá la base nacional desde un solo lugar.
          Los cambios que realices acá reemplazan los datos de la planilla compartida.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={fetchData} disabled={loadingData || saving} loading={loadingData}>
          Recargar datos
        </Button>
        <Button variant="success" onClick={saveChanges} disabled={!hasChanges || saving} loading={saving}>
          Guardar cambios
        </Button>
        <Button variant="secondary" onClick={() => setSheets(data?.sheets ?? null)} disabled={!hasChanges || saving}>
          Descartar cambios
        </Button>
        <Button variant="danger" onClick={resetDatabase} disabled={resetting} loading={resetting}>
          Reinicializar base con la hoja
        </Button>
      </div>

      {loadingData && (
        <div className="flex justify-center py-12">
          <Loader className="h-6 w-6" />
        </div>
      )}

      {sheets && data && !loadingData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-blue-900">Resumen de Supabase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-900/70">Janijim activos</p>
                  <p className="mt-2 text-2xl font-bold text-blue-900">{data.summary.supabase.janijimActivos}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-900/70">Madrijim activos</p>
                  <p className="mt-2 text-2xl font-bold text-green-900">{data.summary.supabase.madrijimActivos}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">Grupos registrados</p>
                  <p className="mt-2 text-2xl font-bold text-amber-900">{data.summary.supabase.gruposRegistrados}</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-900/70">Proyectos</p>
                  <p className="mt-2 text-2xl font-bold text-purple-900">{data.summary.supabase.proyectosRegistrados}</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700/70">Roles activos</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{data.summary.supabase.rolesActivos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-blue-900">Madrijim ({sheets.madrijes.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Grupo</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {sheets.madrijes.map((madrij, index) => (
                        <tr key={`madrij-${index}`} className="text-sm text-slate-800">
                          <td className="px-4 py-3">
                            <input
                              className={inputStyles}
                              value={madrij.nombre}
                              onChange={(event) => updateMadrijField(index, "nombre", event.target.value)}
                              placeholder="Nombre completo"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className={inputStyles}
                              value={madrij.email}
                              onChange={(event) => updateMadrijField(index, "email", event.target.value)}
                              placeholder="correo@ejemplo.com"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className={inputStyles}
                              value={madrij.grupoNombre}
                              onChange={(event) => updateMadrijField(index, "grupoNombre", event.target.value)}
                              placeholder="Nombre del grupo"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMadrij(index)}
                              type="button"
                              className="text-red-600 hover:text-red-700"
                            >
                              Quitar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" onClick={addMadrij} type="button">
                  Agregar madrij
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-blue-900">Janijim ({sheets.janijim.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Grupo</th>
                        <th className="px-4 py-3">Tel. madre</th>
                        <th className="px-4 py-3">Tel. padre</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {sheets.janijim.map((janij, index) => (
                        <tr key={`janij-${index}`} className="text-sm text-slate-800">
                          <td className="px-4 py-3">
                            <input
                              className={inputStyles}
                              value={janij.nombre}
                              onChange={(event) => updateJanijField(index, "nombre", event.target.value)}
                              placeholder="Nombre completo"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className={inputStyles}
                              value={janij.grupoNombre}
                              onChange={(event) => updateJanijField(index, "grupoNombre", event.target.value)}
                              placeholder="Nombre del grupo"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className={inputStyles}
                              value={janij.telMadre ?? ""}
                              onChange={(event) => updateJanijField(index, "telMadre", event.target.value)}
                              placeholder="Teléfono madre"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className={inputStyles}
                              value={janij.telPadre ?? ""}
                              onChange={(event) => updateJanijField(index, "telPadre", event.target.value)}
                              placeholder="Teléfono padre"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeJanij(index)}
                              type="button"
                              className="text-red-600 hover:text-red-700"
                            >
                              Quitar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" onClick={addJanij} type="button">
                  Agregar janij
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-blue-900">Proyectos ({sheets.proyectos.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {sheets.proyectos.map((proyecto, index) => (
                    <div key={`proyecto-${index}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div>
                          <SectionLabel title="Nombre del proyecto" />
                          <input
                            className={`${inputStyles} mt-2`}
                            value={proyecto.nombre}
                            onChange={(event) => updateProyecto(index, "nombre", event.target.value)}
                            placeholder="Nombre del proyecto"
                          />
                        </div>
                        <div>
                          <SectionLabel title="Grupos asociados" description="Ingresá un grupo por línea" />
                          <textarea
                            className={`${textareaStyles} mt-2 min-h-[96px]`}
                            value={proyecto.grupos.join("\n")}
                            onChange={(event) => updateProyecto(index, "grupos", event.target.value)}
                            placeholder={"Grupo 1\nGrupo 2"}
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProyecto(index)}
                          type="button"
                          className="text-red-600 hover:text-red-700"
                        >
                          Quitar proyecto
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={addProyecto} type="button">
                  Agregar proyecto
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-blue-900">Coordinadores ({sheets.coordinadores.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {sheets.coordinadores.map((coordinador, index) => (
                    <div key={`coordinador-${index}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="grid gap-3 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                          <SectionLabel title="Nombre" />
                          <input
                            className={`${inputStyles} mt-2`}
                            value={coordinador.nombre}
                            onChange={(event) => updateCoordinador(index, "nombre", event.target.value)}
                            placeholder="Nombre completo"
                          />
                        </div>
                        <div className="lg:col-span-1">
                          <SectionLabel title="Email" />
                          <input
                            className={`${inputStyles} mt-2`}
                            value={coordinador.email}
                            onChange={(event) => updateCoordinador(index, "email", event.target.value)}
                            placeholder="correo@ejemplo.com"
                          />
                        </div>
                        <div className="lg:col-span-1">
                          <SectionLabel title="Proyectos" description="Un proyecto por línea" />
                          <textarea
                            className={`${textareaStyles} mt-2 min-h-[96px]`}
                            value={coordinador.proyectos.join("\n")}
                            onChange={(event) => updateCoordinador(index, "proyectos", event.target.value)}
                            placeholder={"Proyecto 1\nProyecto 2"}
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCoordinador(index)}
                          type="button"
                          className="text-red-600 hover:text-red-700"
                        >
                          Quitar coordinador
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={addCoordinador} type="button">
                  Agregar coordinador
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-blue-900">Roles avanzados</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                {([
                  { key: "directores", title: "Directores", entries: sheets.directores },
                  { key: "admins", title: "Administradores", entries: sheets.admins },
                ] as const).map((section) => (
                  <div key={section.key} className="space-y-3 rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-blue-900">{section.title}</h4>
                      <span className="text-sm text-blue-900/70">{section.entries.length} personas</span>
                    </div>
                    <div className="space-y-3">
                      {section.entries.map((entry, index) => (
                        <div key={`${section.key}-${index}`} className="grid gap-2">
                          <input
                            className={inputStyles}
                            value={entry.nombre}
                            onChange={(event) => updateRoleEntry(section.key, index, "nombre", event.target.value)}
                            placeholder="Nombre completo"
                          />
                          <div className="flex gap-2">
                            <input
                              className={`${inputStyles} flex-1`}
                              value={entry.email}
                              onChange={(event) => updateRoleEntry(section.key, index, "email", event.target.value)}
                              placeholder="correo@ejemplo.com"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => removeRoleEntry(section.key, index)}
                            >
                              Quitar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" type="button" onClick={() => addRoleEntry(section.key)}>
                      Agregar {section.key === "directores" ? "director" : "admin"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
