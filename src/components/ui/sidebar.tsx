"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { navigationLinks as links } from "@/lib/navigationLinks";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import Button from "@/components/ui/button";
import { useSidebarLinks } from "@/hooks/useSidebarLinks";

export default function Sidebar({ proyectoId }: { proyectoId: string }) {
  const pathname = usePathname();
  const { links: customLinks, addLink, removeLink } = useSidebarLinks();
  const [open, setOpen] = useState(false);

  const home = links.find((l) => l.href === "")!;
  const others = links.filter((l) => l.href !== "");
  const available = others.filter((l) => !customLinks.includes(l.href));

  const renderLink = ({ href, label, icon: Icon }: (typeof links)[number]) => {
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
      <Link
        key={href}
        href={fullPath}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-md transition border-l-4",
          isActive
            ? "bg-blue-50 text-blue-800 border-blue-600 font-semibold"
            : "text-gray-700 border-transparent hover:bg-gray-100",
        )}
      >
        {Icon && <Icon size={18} />}
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex w-64 bg-white border-r p-4 flex-col">
      <nav className="space-y-2 flex-1">
        {renderLink(home)}
        {customLinks.map((href) => {
          const l = others.find((o) => o.href === href);
          if (!l) return null;
          return (
            <div key={href} className="group flex items-center">
              {renderLink(l)}
              <button
                onClick={() => removeLink(href)}
                className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                aria-label={`Quitar ${l.label}`}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="mt-2"
            onClick={() => setOpen((o) => !o)}
            aria-label="Agregar sección"
          >
            <Plus size={18} />
          </Button>
          {open && (
            <ul className="absolute z-10 bg-white border rounded shadow mt-2 w-48">
              {available.map((l) => (
                <li key={l.href}>
                  <button
                    onClick={() => {
                      addLink(l.href);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-100"
                  >
                    {l.icon && <l.icon size={16} />}
                    <span>{l.label}</span>
                  </button>
                </li>
              ))}
              {available.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-500">No hay más opciones</li>
              )}
            </ul>
          )}
        </div>
      </nav>
      <div className="pt-4 mt-4 border-t">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}

