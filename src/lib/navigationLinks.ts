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
  Utensils,
  type LucideIcon,
} from "lucide-react";

export interface NavigationLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

export const navigationLinks: NavigationLink[] = [
  { href: "/dashboard", label: "Mis Proyectos", icon: LayoutDashboard },
  { href: "", label: "Inicio", icon: Home },
  { href: "janijim", label: "Janijim", icon: ClipboardList },
  { href: "materiales", label: "Materiales", icon: FolderKanban },
  { href: "notas", label: "Notas", icon: Book },
  { href: "calendario", label: "Calendario", icon: Calendar },
  { href: "tareas", label: "Tareas", icon: CheckSquare },
  { href: "planificaciones", label: "Planificaciones", icon: PencilRuler },
  { href: "actividades", label: "Actividades", icon: PartyPopper },
  { href: "comidas", label: "Comidas", icon: Utensils },
  { href: "chatbot", label: "Chatbot", icon: Bot },
];
