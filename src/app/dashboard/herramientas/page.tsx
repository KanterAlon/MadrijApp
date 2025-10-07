"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Phone,
  Search,
  Users,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Loader from "@/components/ui/loader";
import type { JanijSearchResult } from "@/lib/supabase/janijim";

type ApiResponse = {
  results?: JanijSearchResult[];
  error?: string;
};

const MIN_QUERY_LENGTH = 2;

const quickLinks = [
  {
    href: "/dashboard/tareas",
    title: "Gestión de tareas",
    description: "Revisa y actualiza los pendientes de tu tnuá en segundos.",
    icon: CheckSquare,
  },
  {
    href: "/dashboard",
    title: "Mis proyectos",
    description: "Salta rápidamente a la kvutzá o proyecto que necesitás.",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/nuevo",
    title: "Crear nuevo proyecto",
    description: "Iniciá una nueva planificación para el próximo evento.",
    icon: FolderKanban,
  },
];

export default function HerramientasPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JanijSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setHasSearched(false);
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      try {
        const response = await fetch(
          `/api/janijim/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Respuesta inválida del servidor");
        }

        const data = (await response.json()) as ApiResponse;
        setResults(data.results ?? []);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        console.error("Error fetching janijim", err);
        setResults([]);
        setError("No pudimos completar la búsqueda. Intentalo nuevamente.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const helperText = useMemo(() => {
    if (error) return error;
    if (!hasSearched && query.trim().length < MIN_QUERY_LENGTH) {
      return "Escribí al menos dos letras para iniciar la búsqueda.";
    }
    if (hasSearched && !loading && results.length === 0) {
      return "No encontramos janijim con ese nombre.";
    }
    return null;
  }, [error, hasSearched, loading, query, results.length]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
            <Wrench className="w-7 h-7" /> Herramientas institucionales
          </h1>
          <p className="text-gray-600">
            Centralizá la información clave de tus janijim y accedé a utilidades
            frecuentes sin salir del dashboard.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Volver al panel
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-700" /> Buscador global de
            janijim
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex-1">
              <span className="sr-only">Nombre del janij</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscá por nombre o apellido"
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </label>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader className="h-4 w-4" /> Consultando datos…
            </div>
          )}

          {helperText && !loading && (
            <p className="text-sm text-gray-600">{helperText}</p>
          )}

          <div className="space-y-3">
            {results.map((result) => (
              <article
                key={result.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">
                      {result.nombre}
                    </h3>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {result.grupoNombre ?? "Sin grupo asignado"}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {result.telMadre && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Madre: {result.telMadre}
                      </p>
                    )}
                    {result.telPadre && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Padre: {result.telPadre}
                      </p>
                    )}
                  </div>
                </div>
                {result.responsables.length > 0 && (
                  <div className="mt-3 text-sm text-gray-700">
                    <p className="font-medium text-gray-800">Madrijim responsables</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {result.responsables.map((madrij) => (
                        <li key={madrij.id}>
                          {madrij.nombre}
                          {madrij.email && (
                            <span className="text-gray-500"> — {madrij.email}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-blue-900">
          <Wrench className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Accesos rápidos</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map(({ href, title, description, icon: Icon }) => (
            <Card key={href} className="h-full border-blue-50">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="rounded-md bg-blue-100 p-2 text-blue-700">
                  <Icon className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{description}</p>
                <Link
                  href={href}
                  className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Abrir
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
