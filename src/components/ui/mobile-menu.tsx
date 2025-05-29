"use client";


import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/asistencia", label: "Asistencia" },
  { href: "/notas", label: "Notas" },
  { href: "/excel", label: "Excel" },
  { href: "/calendario", label: "Calendario" },
  { href: "/tareas", label: "Tareas" },
  { href: "/planificaciones", label: "Planificaciones" },
  { href: "/actividades", label: "Actividades" },
  { href: "/chatbot", label: "Chatbot" },
];

export default function MobileMenu() {
  const pathname = usePathname();

  return (
    <div className="md:hidden p-4 bg-white shadow-md flex items-center">
      <Sheet>
        <SheetTrigger>
          <Menu className="text-blue-700" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-4">
          <SheetTitle className="text-lg font-bold text-blue-700">
            Menú principal
          </SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
    Navegá por las secciones de la app.
  </SheetDescription>

          <nav className="space-y-4 mt-6">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block text-base font-medium ${
                  pathname === href ? "text-blue-700" : "text-gray-700"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <h1 className="ml-4 text-lg font-bold text-blue-800">MadrijApp</h1>
    </div>
  );
}
