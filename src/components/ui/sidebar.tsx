"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import {
  dashboardNavigationLinks,
  projectNavigationLinks,
  type NavigationLink,
} from "@/lib/navigationLinks";

export default function Sidebar({ proyectoId }: { proyectoId: string }) {
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
        {projectNavigationLinks.map(renderLink)}
        <div className="pt-4 mt-4 border-t">
          <p className="px-4 text-xs font-semibold uppercase text-gray-500">
            Herramientas institucionales
          </p>
          <div className="mt-2 space-y-2">
            {dashboardNavigationLinks
              .filter((link) => link.href !== "/dashboard")
              .map((link) => renderLink(link))}
          </div>
        </div>
      </nav>
      <div className="pt-4 mt-4 border-t">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}

