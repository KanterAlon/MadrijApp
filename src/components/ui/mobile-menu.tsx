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
import {
  dashboardNavigationLinks,
  projectNavigationLinks,
  type NavigationLink,
} from "@/lib/navigationLinks";

type MobileMenuProps = {
  proyectoId: string;
};

export default function MobileMenu({ proyectoId }: MobileMenuProps) {
  const pathname = usePathname();

  const renderLink = ({ href, label, icon: Icon }: NavigationLink) => {
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
              {projectNavigationLinks.map(renderLink)}
            </nav>
            <div className="mt-6 border-t pt-4">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Herramientas institucionales
              </p>
              <div className="mt-2 space-y-2">
                {dashboardNavigationLinks
                  .filter((link) => link.href !== "/dashboard")
                  .map((link) => renderLink(link))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold text-blue-800">MadrijApp</h1>
      </div>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
