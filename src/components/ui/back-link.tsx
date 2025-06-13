"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BackLinkProps {
  href: string;
  className?: string;
  label?: string;
}

export default function BackLink({
  href,
  className,
  label = "Volver",
}: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-blue-600 hover:underline",
        className
      )}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </Link>
  );
}
