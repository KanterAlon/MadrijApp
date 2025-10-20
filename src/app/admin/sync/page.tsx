"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-hot-toast";

import Loader from "@/components/ui/loader";
import Button from "@/components/ui/button";
import { showError } from "@/lib/alerts";
import type { AdminSyncCommitResult, CoordinatorProjectPreview, RoleDiffPreview, SyncPreview } from "@/lib/sync/adminSync";

function formatCountLabel(value: number, singular: string, plural?: string) {
  if (value === 1) return `1 ${singular}`;
  return `${value} ${plural ?? `${singular}s`}`;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">{children}</span>;
}

type RolesResponse = { roles: string[] };

type PreviewResponse = { runId: string; preview: SyncPreview };

type CommitResponse = { preview: SyncPreview; result: AdminSyncCommitResult };

export default function AdminSyncPage() {
  const { user } = useUser();
  const [roles, setRoles] = useState<string[] | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<AdminSyncCommitResult | null>(null);

  const isAdmin = useMemo(() => roles?.includes("admin") ?? false, [roles]);

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

  const gruposConCambios = useMemo(() => {
    if (!preview) return [] as SyncPreview["grupos"]["detalle"];
    return preview.grupos.detalle.filter((grupo) =>
      grupo.esGrupoNuevo ||
      grupo.esProyectoNuevo ||
      grupo.inserts.length > 0 ||
      grupo.updates.length > 0 ||
      grupo.deactivations.length > 0,
    );
  }, [preview]);

  const gruposSinCambios = useMemo(() => {
    if (!preview) return [] as SyncPreview["grupos"]["detalle"];
    const withChanges = new Set(gruposConCambios.map((grupo) => grupo.grupoKey));
    return preview.grupos.detalle.filter((grupo) => !withChanges.has(grupo.grupoKey));
  }, [preview, gruposConCambios]);

  const generarVistaPrevia = async () => {
    setLoadingPreview(true);
    setCommitResult(null);
    try {
      const res = await fetch("/api/admin/sync/runs", { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudo generar la vista previa");
      }
      const payload = (await res.json()) as PreviewResponse;
      setPreview(payload.preview);
      setRunId(payload.runId);
      toast.success("Generamos la vista previa con los últimos datos de la hoja");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo generar la vista previa";
      showError(message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const confirmarSincronizacion = async () => {
    if (!runId) {
      showError("Primero generá la vista previa");
      return;
    }
    setCommitting(true);
    try {
      const res = await fetch(`/api/admin/sync/runs/${runId}/commit`, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "No se pudo completar la sincronización");
      }
      const data = payload as CommitResponse;
      setPreview(data.preview);
      setCommitResult(data.result);
      toast.success("Actualizamos la base de datos con los datos de la hoja");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo completar la sincronización";
      showError(message);
    } finally {
      setCommitting(false);
    }
  };

  const renderRoleDiff = (diff: RoleDiffPreview) => {
    return (
      <div key={diff.role} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-blue-900">{diff.role.toUpperCase()}</h4>
          <div className="flex gap-2 text-xs text-blue-900/70">
            <Badge>{formatCountLabel(diff.totalSheet, "registro en hoja")}</Badge>
            <Badge>{formatCountLabel(diff.totalActivos, "activo", "activos")}</Badge>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold">Altas</p>
            <p>{formatCountLabel(diff.nuevos.length, "persona")}</p>
            {diff.nuevos.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-blue-900/80">
                {diff.nuevos.slice(0, 6).map((entry) => (
                  <li key={`nuevo-${diff.role}-${entry.email}`}>{entry.email}</li>
                ))}
                {diff.nuevos.length > 6 && <li>… y {diff.nuevos.length - 6} más</li>}
              </ul>
            )}
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
            <p className="font-semibold">Reactivaciones</p>
            <p>{formatCountLabel(diff.reactivar.length, "usuario")}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Bajas</p>
            <p>{formatCountLabel(diff.desactivar.length, "usuario")}</p>
            {diff.desactivar.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-amber-900/80">
                {diff.desactivar.slice(0, 6).map((entry) => (
                  <li key={`baja-${diff.role}-${entry.email}`}>{entry.email}</li>
                ))}
                {diff.desactivar.length > 6 && <li>… y {diff.desactivar.length - 6} más</li>}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCoordinator = (entry: CoordinatorProjectPreview) => {
    return (
      <div key={entry.email} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="text-base font-semibold text-blue-900">{entry.nombre}</h4>
        <p className="text-sm text-blue-900/70">{entry.email}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold">En la hoja</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-900/80">
              {entry.proyectosSheet.length === 0 ? <li>Sin proyectos</li> : entry.proyectosSheet.map((nombre) => <li key={`sheet-${entry.email}-${nombre}`}>{nombre}</li>)}
            </ul>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
            <p className="font-semibold">Se asignarán</p>
            <ul className="mt-2 space-y-1 text-xs text-green-900/80">
              {entry.proyectosNuevos.length === 0 ? <li>Sin cambios</li> : entry.proyectosNuevos.map((nombre) => <li key={`nuevo-${entry.email}-${nombre}`}>{nombre}</li>)}
            </ul>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Se quitarán</p>
            <ul className="mt-2 space-y-1 text-xs text-amber-900/80">
              {entry.proyectosRemovidos.length === 0 ? <li>Sin cambios</li> : entry.proyectosRemovidos.map((nombre) => <li key={`removido-${entry.email}-${nombre}`}>{nombre}</li>)}
            </ul>
            {entry.proyectosInexistentes.length > 0 && (
              <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
                <p className="font-semibold">Proyectos ausentes en la base:</p>
                <ul className="mt-1 space-y-1">
                  {entry.proyectosInexistentes.map((nombre) => (
                    <li key={`missing-${entry.email}-${nombre}`}>{nombre}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCommitResult = (result: AdminSyncCommitResult) => {
    const totalInsertados = result.grupos.reduce((acc, item) => acc + item.inserted, 0);
    const totalActualizados = result.grupos.reduce((acc, item) => acc + item.updated, 0);
    const totalBajas = result.grupos.reduce((acc, item) => acc + item.deactivated, 0);
    const totalMadAltas = result.grupos.reduce((acc, item) => acc + item.madrijInserted, 0);
    const totalMadBajas = result.grupos.reduce((acc, item) => acc + item.madrijDeactivated, 0);

    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-emerald-900">Base actualizada</h2>
        <p className="mt-1 text-sm text-emerald-900/80">
          Confirmamos la importación y guardamos los cambios en Supabase. A continuación tenés un resumen de lo aplicado.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="text-sm font-semibold text-blue-900">Janijim</h3>
            <p className="mt-2 text-sm text-blue-900/70">
              {formatCountLabel(totalInsertados, "alta")}, {formatCountLabel(totalActualizados, "actualización")}, {formatCountLabel(totalBajas, "baja")}.
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="text-sm font-semibold text-blue-900">Madrijim</h3>
            <p className="mt-2 text-sm text-blue-900/70">
              {formatCountLabel(totalMadAltas, "alta")}, {formatCountLabel(totalMadBajas, "baja")}.
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="text-sm font-semibold text-blue-900">Roles</h3>
            <p className="mt-2 text-sm text-blue-900/70">
              Coordinadores sincronizados: {result.roles.coordinadoresProyectos.upserted} enlaces nuevos, {result.roles.coordinadoresProyectos.removed} removidos.
            </p>
          </div>
        </div>
      </section>
    );
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
          Esta sección es exclusiva para el administrador de la aplicación. Si necesitás actualizar los datos institucionales, solicitá acceso al equipo nacional.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-900">Sincronización anual</h1>
        <p className="mt-2 text-sm text-blue-900/70">
          Desde esta interfaz vas a importar la hoja institucional a Supabase. Primero generá la vista previa, revisá los cambios y, cuando estés seguro, confirmá la sincronización.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-blue-900">1. Generar vista previa</h2>
          <p className="mt-1 text-sm text-blue-900/70">Tomamos la última versión de la hoja de cálculo y te mostramos los cambios detectados.</p>
        </div>
        <Button onClick={generarVistaPrevia} disabled={loadingPreview} variant="primary">
          {loadingPreview ? "Procesando…" : "Generar vista previa"}
        </Button>
      </div>

      {preview && (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-blue-900">Resumen general</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4 text-blue-900">
                <p className="text-sm font-semibold">Proyectos en la hoja</p>
                <p className="mt-2 text-2xl font-bold">{preview.resumen.totalProyectosHoja}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-blue-900">
                <p className="text-sm font-semibold">Grupos a revisar</p>
                <p className="mt-2 text-2xl font-bold">{preview.resumen.totalGruposHoja}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-green-900">
                <p className="text-sm font-semibold">Altas de janijim</p>
                <p className="mt-2 text-2xl font-bold">{preview.resumen.janijim.insertar}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-amber-900">
                <p className="text-sm font-semibold">Bajas previstas</p>
                <p className="mt-2 text-2xl font-bold">{preview.resumen.janijim.desactivar + preview.resumen.gruposOrfanos}</p>
              </div>
            </div>

            {preview.resumen.nuevosProyectos.length > 0 && (
              <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">Nuevos proyectos detectados</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {preview.resumen.nuevosProyectos.map((nombre) => (
                    <li key={nombre}>{nombre}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.resumen.nuevosGrupos.length > 0 && (
              <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-900">
                <p className="font-semibold">Nuevos grupos en la hoja</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {preview.resumen.nuevosGrupos.map((item) => (
                    <li key={`${item.grupo}-${item.proyecto ?? "sin-proyecto"}`}>
                      {item.grupo} {item.proyecto ? `· Proyecto ${item.proyecto}` : "· Sin proyecto asignado"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-blue-900">2. Revisá los janijim grupo por grupo</h2>
              <p className="mt-1 text-sm text-blue-900/70">
                Verificá los cambios detectados antes de confirmar. Agrupamos las altas, actualizaciones y bajas por cada grupo.
              </p>
              {gruposConCambios.length === 0 ? (
                <p className="mt-4 text-sm text-blue-900/70">No encontramos cambios en los grupos cargados en la hoja.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {gruposConCambios.map((grupo) => (
                    <div key={grupo.grupoKey} className="rounded-lg border border-slate-200 bg-blue-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-blue-900">{grupo.grupoNombre}</h3>
                        <div className="flex flex-wrap gap-2 text-xs text-blue-900/70">
                          {grupo.proyectoNombre ? <Badge>Proyecto {grupo.proyectoNombre}</Badge> : <Badge>Sin proyecto asignado</Badge>}
                          <Badge>{formatCountLabel(grupo.inserts.length, "alta")}</Badge>
                          <Badge>{formatCountLabel(grupo.updates.length, "actualización")}</Badge>
                          <Badge>{formatCountLabel(grupo.deactivations.length, "baja")}</Badge>
                        </div>
                      </div>
                      {grupo.inserts.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-blue-900">Altas</p>
                          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-blue-900/80">
                            {grupo.inserts.map((entry) => (
                              <li key={`insert-${grupo.grupoKey}-${entry.nombre}`}>{entry.nombre}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {grupo.updates.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-blue-900">Actualizaciones</p>
                          <ul className="mt-1 space-y-2 text-sm text-blue-900/80">
                            {grupo.updates.map((update) => (
                              <li key={`update-${grupo.grupoKey}-${update.id}`} className="rounded-md bg-white/70 p-2">
                                <div className="font-medium text-blue-900">{update.nombreNuevo}</div>
                                <ul className="mt-1 list-disc space-y-1 pl-4">
                                  {update.cambios.nombre && (
                                    <li>
                                      Nombre: {update.cambios.nombre.before ?? "(sin dato)"} → {update.cambios.nombre.after ?? "(sin dato)"}
                                    </li>
                                  )}
                                  {update.cambios.telMadre && (
                                    <li>
                                      Tel. madre: {update.cambios.telMadre.before ?? "(sin dato)"} → {update.cambios.telMadre.after ?? "(sin dato)"}
                                    </li>
                                  )}
                                  {update.cambios.telPadre && (
                                    <li>
                                      Tel. padre: {update.cambios.telPadre.before ?? "(sin dato)"} → {update.cambios.telPadre.after ?? "(sin dato)"}
                                    </li>
                                  )}
                                  {update.reactivar && <li className="text-green-700">Se reactivará este janij</li>}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {grupo.deactivations.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-blue-900">Bajas</p>
                          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-blue-900/80">
                            {grupo.deactivations.map((entry) => (
                              <li key={`deact-${grupo.grupoKey}-${entry.id}`}>{entry.nombre}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {gruposSinCambios.length > 0 && (
                <p className="mt-4 text-xs text-blue-900/60">
                  {formatCountLabel(gruposSinCambios.length, "grupo")}: sin modificaciones detectadas, igual los sincronizaremos para asegurar consistencia.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-blue-900">3. Roles y equipos</h2>
            <p className="mt-1 text-sm text-blue-900/70">Así quedarán los permisos institucionales después de la importación.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {preview.roles.map((diff) => renderRoleDiff(diff))}
            </div>
            {preview.coordinadores.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-base font-semibold text-blue-900">Asignación de coordinadores</h3>
                {preview.coordinadores.map((entry) => renderCoordinator(entry))}
              </div>
            )}
          </section>

          {preview.grupos.orfanos.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-amber-900">Grupos que ya no aparecen en la hoja</h2>
              <p className="mt-1 text-sm text-amber-900/80">
                Los madrijim y janijim asociados se desactivarán automáticamente para dejar limpia la base del ciclo anterior.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-900">
                {preview.grupos.orfanos.map((grupo) => (
                  <li key={grupo.grupoId}>
                    {grupo.grupoNombre}
                    {grupo.proyectos.length > 0 && (
                      <span className="ml-2 text-amber-900/70">· {grupo.proyectos.map((p) => p.nombre).join(", ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-900">4. Confirmar importación</h2>
              <p className="mt-1 text-sm text-blue-900/70">
                Esta acción reemplaza la base nacional con los datos revisados. Podés repetir el proceso cuando recibas una hoja actualizada.
              </p>
            </div>
            <Button onClick={confirmarSincronizacion} disabled={committing} variant="secondary">
              {committing ? "Sincronizando…" : "Confirmar y actualizar"}
            </Button>
          </div>
        </div>
      )}

      {commitResult && renderCommitResult(commitResult)}
    </div>
  );
}
