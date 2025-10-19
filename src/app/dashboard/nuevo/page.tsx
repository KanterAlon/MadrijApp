"use client";

import Link from "next/link";

import BackLink from "@/components/ui/back-link";

export default function NuevoProyectoPage() {
  return (
    <div className="mx-auto mt-24 max-w-xl rounded-2xl bg-white p-6 shadow">
      <BackLink href="/dashboard" className="mb-4 inline-flex" />
      <h1 className="mb-3 text-2xl font-bold text-center text-blue-700">
        Proyectos gestionados desde la planilla
      </h1>
      <p className="text-sm text-gray-700">
        Los proyectos y grupos se crean automáticamente a partir de la hoja de
        cálculo institucional. Ingresá con el correo que figura en la pestaña de
        madrijim y reclamá tu perfil para acceder al tablero asignado.
      </p>
      <p className="mt-4 text-sm text-gray-700">
        Si necesitás sumar una nueva kvutzá o actualizar datos, pedile al equipo
        administrativo que edite la planilla compartida. Podés volver al
        dashboard para ver tus proyectos disponibles.
      </p>
      <div className="mt-6 text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
