"use client";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";

type MobileMenuProps = {
  proyectoId: string;
};

const links = [
  { href: "/dashboard", label: "Mis Proyectos" },
  { href: "", label: "Inicio" },
  { href: "janijim", label: "Janijim" },
  { href: "materiales", label: "Materiales" },
  { href: "notas", label: "Notas" },
  { href: "calendario", label: "Calendario" },
  { href: "tareas", label: "Tareas" },
  { href: "planificaciones", label: "Planificaciones" },
  { href: "actividades", label: "Actividades" },
  { href: "chatbot", label: "Chatbot" },
];

export default function MobileMenu({ proyectoId }: MobileMenuProps) {
  const pathname = usePathname();

  return (
    <div className="md:hidden p-4 bg-white shadow-md flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger aria-label="Abrir men\u00fa de navegaci\u00f3n">
            <Menu className="text-blue-700" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <SheetTitle className="text-lg font-bold text-blue-700">
              Menú principal
            </SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              Navegá por las secciones del proyecto.
            </SheetDescription>

            <nav className="space-y-4 mt-6">
              {links.map(({ href, label }) => {
                const fullPath = href.startsWith("/")
                  ? href
                  : href
                  ? `/proyecto/${proyectoId}/${href}`
                  : `/proyecto/${proyectoId}`;
                const isRoot = href === "";
                const isActive = isRoot
                  ? pathname === fullPath || pathname === fullPath + "/"
                  : pathname === fullPath || pathname.startsWith(fullPath + "/");

                return (
                  <SheetClose asChild key={href}>
                    <Link
                      href={fullPath}
                      className={cn(
                        "block text-base font-medium",
                        isActive ? "text-blue-700" : "text-gray-700"
                      )}
                    >
                      {label}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold text-blue-800">MadrijApp</h1>
      </div>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
