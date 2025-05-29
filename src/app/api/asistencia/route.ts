import { NextResponse } from "next/server";
import { janijim } from "@/lib/mock-data/janijim";
import { marcarAsistencia, getAllAsistencia } from "@/lib/logic/asistencia";

export async function GET() {
  const data = janijim.map((j) => ({
    ...j,
    estado: getAllAsistencia()[j.id] || "ausente",
  }));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { id, estado } = await req.json();
  if (!id || !["presente", "ausente"].includes(estado)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const actualizado = marcarAsistencia(id, estado);
  return NextResponse.json(actualizado);
}
