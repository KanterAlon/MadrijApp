"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, RefreshCw } from "lucide-react";

import { AdminManagePanel } from "@/components/admin/AdminManagePanel";
import { AdminSyncPanel } from "@/components/admin/AdminSyncPanel";

const sections = [
  {
    id: "manage" as const,
    label: "Editar hoja institucional",
    description:
      "Actualizá los datos compartidos directamente desde la app, guardalos en la planilla y reflejalos en Supabase en un solo paso.",
    icon: FileSpreadsheet,
    component: <AdminManagePanel />,
  },
  {
    id: "sync" as const,
    label: "Sincronización avanzada",
    description:
      "Generá vistas previas, revisá diferencias y aplicá sincronizaciones completas entre la hoja y la base de datos cuando lo necesites.",
    icon: RefreshCw,
    component: <AdminSyncPanel />,
  },
];

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["id"]>("manage");

  const section = useMemo(() => sections.find((entry) => entry.id === activeSection) ?? sections[0], [activeSection]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-10 md:px-8">
        <header className="space-y-3 text-blue-900">
          <h1 className="text-4xl font-bold">Panel administrativo</h1>
          <p className="max-w-3xl text-base text-blue-900/80">
            Centralizá todas las herramientas institucionales desde un único lugar seguro. Editá la planilla nacional, controlá la
            sincronización con Supabase y mantené la información siempre actualizada sin salir de la aplicación.
          </p>
        </header>

        <nav className="flex flex-wrap gap-3 rounded-2xl border border-blue-100 bg-white/70 p-4 shadow-sm backdrop-blur">
          {sections.map(({ id, icon: Icon, label, description }) => {
            const isActive = id === section.id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`flex min-h-[120px] flex-1 min-w-[220px] flex-col gap-2 rounded-xl border px-4 py-3 text-left transition-all ${
                  isActive
                    ? "border-blue-500 bg-blue-50 text-blue-900 shadow-md"
                    : "border-transparent bg-white text-blue-900/70 hover:border-blue-200 hover:bg-blue-50/70"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-blue-400"}`} />
                  {label}
                </div>
                <p className="text-sm leading-relaxed text-blue-900/70">{description}</p>
              </button>
            );
          })}
        </nav>

        <section className="rounded-2xl border border-blue-100 bg-white/80 p-6 shadow-md backdrop-blur">
          {section.component}
        </section>
      </div>
    </div>
  );
}
