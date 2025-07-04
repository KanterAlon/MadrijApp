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
import { navigationLinks as links } from "@/lib/navigationLinks";

type MobileMenuProps = {
  proyectoId: string;
};


export default function MobileMenu({ proyectoId }: MobileMenuProps) {
  const pathname = usePathname();

  return (
    <div
      className="md:hidden fixed top-0 inset-x-0 z-20 p-4 bg-white/90 shadow-md backdrop-blur flex items-center justify-between"
      style={{ WebkitBackdropFilter: "blur(8px)" }}
    >
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
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "block text-base font-medium",
                        isActive
                          ? "text-blue-700 font-semibold"
                          : "text-gray-700"
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
