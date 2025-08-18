"use client";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import Button from "@/components/ui/button";
import { useState } from "react";
import { useSidebarLinks } from "@/hooks/useSidebarLinks";
import { navigationLinks as allLinks } from "@/lib/navigationLinks";

type MobileMenuProps = {
  proyectoId: string;
};

export default function MobileMenu({ proyectoId }: MobileMenuProps) {
  const pathname = usePathname();
  const { links: customLinks, addLink, removeLink } = useSidebarLinks();
  const [open, setOpen] = useState(false);

  const home = allLinks.find((l) => l.href === "")!;
  const others = allLinks.filter((l) => l.href !== "");
  const available = others.filter((l) => !customLinks.includes(l.href));

  const renderLink = ({ href, label, icon: Icon }: (typeof allLinks)[number]) => {
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
      <SheetClose asChild>
        <Link
          href={fullPath}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 px-2 py-2 rounded-md",
            isActive ? "text-blue-700 font-semibold" : "text-gray-700",
          )}
        >
          {Icon && <Icon size={18} />}
          <span>{label}</span>
        </Link>
      </SheetClose>
    );
  };

  return (
    <div
      className="md:hidden fixed top-0 inset-x-0 z-20 p-4 bg-white/90 shadow-md backdrop-blur flex items-center justify-between"
      style={{ WebkitBackdropFilter: "blur(8px)" }}
    >
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger aria-label="Abrir menú de navegación">
            <Menu className="text-blue-700" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <SheetTitle className="text-lg font-bold text-blue-700">
              Menú principal
            </SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              Navegá por las secciones del proyecto.
            </SheetDescription>

            <nav className="space-y-2 mt-6">
              {renderLink(home)}
              {customLinks.map((href) => {
                const l = others.find((o) => o.href === href);
                if (!l) return null;
                return (
                  <div key={href} className="flex items-center">
                    {renderLink(l)}
                    <button
                      onClick={() => removeLink(href)}
                      className="ml-2 text-gray-400 hover:text-red-500"
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
                      <li className="px-3 py-2 text-sm text-gray-500">
                        No hay más opciones
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold text-blue-800">MadrijApp</h1>
      </div>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
