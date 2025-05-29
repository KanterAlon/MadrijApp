type AsistenciaEstado = "presente" | "ausente";

const asistenciaData: Record<string, AsistenciaEstado> = {};

export function getAllAsistencia() {
  return asistenciaData;
}

export function marcarAsistencia(id: string, estado: AsistenciaEstado) {
  asistenciaData[id] = estado;
  return { id, estado };
}
