"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignInButton, SignOutButton } from "@clerk/nextjs";
import { Home, Notebook, Calendar, FileText, Users, Bot } from "lucide-react";

const links = [
  { href: "/", label: "Inicio", icon: <Home size={20} /> },
  { href: "/asistencia", label: "Asistencia", icon: <Users size={20} /> },
  { href: "/notas", label: "Notas", icon: <Notebook size={20} /> },
  { href: "/excel", label: "Excel", icon: <FileText size={20} /> },
  { href: "/calendario", label: "Calendario", icon: <Calendar size={20} /> },
  { href: "/tareas", label: "Tareas", icon: <Notebook size={20} /> },
  { href: "/planificaciones", label: "Planificaciones", icon: <Notebook size={20} /> },
  { href: "/actividades", label: "Actividades", icon: <FileText size={20} /> },
  { href: "/chatbot", label: "Chatbot", icon: <Bot size={20} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isSignedIn } = useUser();

  return (
    <aside className="w-64 min-h-screen bg-white border-r p-4 hidden md:flex flex-col justify-between">
      <nav className="space-y-2">
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition hover:bg-blue-100 ${
              pathname === href ? "bg-blue-100 text-blue-700" : "text-gray-700"
            }`}
          >
            {icon}
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 border-t pt-4 text-sm text-gray-700">
        {!isSignedIn ? (
          <div className="space-y-2">
            <p className="text-gray-500">¿Sos madrij?</p>
            <SignInButton mode="modal">
              <button className="w-full text-left bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition">
                Iniciar sesión / Crear cuenta
              </button>
            </SignInButton>
          </div>
        ) : (
          <div className="space-y-2">
            <p>
              👋 Hola, <span className="font-semibold">{user.firstName}</span>
            </p>
            <SignOutButton>
              <button className="text-sm text-red-600 hover:underline">Cerrar sesión</button>
            </SignOutButton>
          </div>
        )}
      </div>
    </aside>
  );
}
