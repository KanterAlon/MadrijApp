"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import {
  ClipboardList,
  Book,
  Calendar,
  CheckSquare,
  PencilRuler,
  PartyPopper,
  Bot,
  Home,
  LayoutDashboard,
  FolderKanban,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Mis Proyectos", icon: LayoutDashboard },
  { href: "", label: "Inicio", icon: Home },
  { href: "janijim", label: "Janijim", icon: ClipboardList },
  { href: "materiales", label: "Materiales", icon: FolderKanban },
  { href: "notas", label: "Notas", icon: Book },
  { href: "calendario", label: "Calendario", icon: Calendar },
  { href: "tareas", label: "Tareas", icon: CheckSquare },
  { href: "planificaciones", label: "Planificaciones", icon: PencilRuler },
  { href: "actividades", label: "Actividades", icon: PartyPopper },
  { href: "chatbot", label: "Chatbot", icon: Bot },
];

export default function Sidebar({ proyectoId }: { proyectoId: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 bg-white border-r p-4 flex-col">
      <nav className="space-y-2 flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const fullPath = href.startsWith("/")
            ? href
            : href
            ? `/proyecto/${proyectoId}/${href}`
            : `/proyecto/${proyectoId}`;
          const isActive = pathname === fullPath || pathname === fullPath + "/";

          return (
            <Link
              key={href}
              href={fullPath}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-md transition",
                isActive
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="pt-4 mt-4 border-t">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}
