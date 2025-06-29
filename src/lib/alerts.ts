import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export function showError(message: string) {
  return Swal.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    confirmButtonColor: '#2563eb',
  });
}

export async function confirmDialog(message: string) {
  const result = await Swal.fire({
    title: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí',
    cancelButtonText: 'Cancelar',
  });
  return result.isConfirmed;
}

export type ParentOption = 'madre' | 'padre' | null;

export async function chooseParentDialog(message: string): Promise<ParentOption> {
  const result = await Swal.fire({
    title: message,
    icon: 'question',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonColor: '#2563eb',
    denyButtonColor: '#2563eb',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Mamá',
    denyButtonText: 'Papá',
    cancelButtonText: 'Cancelar',
  });

  if (result.isConfirmed) return 'madre';
  if (result.isDenied) return 'padre';
  return null;
}
