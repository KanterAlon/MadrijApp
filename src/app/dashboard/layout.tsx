"use client";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-xl">Mis Proyectos</h2>
          <a href="/dashboard/tareas" className="text-sm text-blue-600 hover:underline">Mis tareas</a>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
