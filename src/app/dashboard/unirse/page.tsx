"use client";

import Link from "next/link";

import Button from "@/components/ui/button";

export default function UnirseProyectoPage() {
  return (
    <div className="mx-auto mt-24 max-w-md rounded-2xl border border-blue-100 bg-white p-6 text-center shadow">
      <h1 className="text-2xl font-bold text-blue-900">Acceso por invitacion</h1>
      <p className="mt-4 text-sm text-blue-900/70">
        Los codigos de invitacion ya no se utilizan. Si necesitas sumarte a un proyecto, pedile al administrador que vincule tu cuenta
        desde la hoja institucional o desde el panel de gestion.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button asChild>
          <Link href="/dashboard">Volver al tablero</Link>
        </Button>
        <p className="text-xs text-blue-900/60">
          Si tu correo no figura en la planilla compartida, comparti tus datos con el equipo para que puedan asignarte el grupo correcto.
        </p>
      </div>
    </div>
  );
}

