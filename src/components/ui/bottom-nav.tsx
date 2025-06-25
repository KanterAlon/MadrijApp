"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigationLinks as links } from "@/lib/navigationLinks";

export default function BottomNav({ proyectoId }: { proyectoId: string }) {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur border-t shadow flex justify-around py-2"
      style={{ WebkitBackdropFilter: "blur(8px)" }}
    >
      {links.map(({ href, label, icon: Icon }) => {
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
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-xs py-1 flex-1 transition-colors",
              isActive
                ? "text-blue-600 border-t-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-blue-600"
            )}
          >
            {Icon && <Icon size={24} />}
            <span className="leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
