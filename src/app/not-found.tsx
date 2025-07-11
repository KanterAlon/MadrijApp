import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto mt-24 text-center bg-white p-8 rounded-2xl shadow-md">
      <div className="flex justify-center mb-4 text-red-600">
        <AlertCircle size={48} />
      </div>
      <h1 className="text-3xl font-semibold text-red-700 mb-2">Página no encontrada</h1>
      <p className="text-gray-600">La página que buscás no existe.</p>
    </div>
  );
}
