import Sidebar from "@/components/ui/sidebar";
import MobileMenu from "@/components/ui/mobile-menu";

export default async function ProyectoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id: proyectoId } = await params

  return (
    <div className="min-h-screen md:flex">
      <Sidebar proyectoId={proyectoId} />
      <div className="flex-1 flex flex-col">
        <MobileMenu proyectoId={proyectoId} />
        <main className="p-4 md:p-6 pt-20 md:pt-6 w-full max-w-4xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
