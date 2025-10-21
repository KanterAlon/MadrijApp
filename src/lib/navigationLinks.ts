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
  Wrench,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavigationLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

export const projectNavigationLinks: NavigationLink[] = [
  { href: "", label: "Inicio", icon: Home },
  { href: "grupos", label: "Grupos", icon: Users },
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

export const dashboardNavigationLinks: NavigationLink[] = [
  { href: "/dashboard", label: "Mis Proyectos", icon: LayoutDashboard },
  {
    href: "/dashboard/herramientas",
    label: "Herramientas institucionales",
    icon: Wrench,
  },
  { href: "/dashboard/tareas", label: "Mis tareas", icon: CheckSquare },
];

export const navigationLinks = projectNavigationLinks;
