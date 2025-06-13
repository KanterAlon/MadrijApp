"use client";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { CheckSquare } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-xl">Mis Proyectos</h2>
          <Link
            href="/dashboard/tareas"
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <CheckSquare className="w-4 h-4" />
            Mis tareas
          </Link>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
