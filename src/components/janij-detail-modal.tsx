"use client";

import { Check, PhoneCall } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import Button from "@/components/ui/button";

export type JanijDetailField =
  | "dni"
  | "numero_socio"
  | "grupo"
  | "tel_madre"
  | "tel_padre";

export type JanijSummary = {
  id: string;
  nombre: string;
  dni: string | null;
  numero_socio: string | null;
  grupo: string | null;
  tel_madre: string | null;
  tel_padre: string | null;
};

const fieldLabels: Record<JanijDetailField, string> = {
  dni: "DNI",
  numero_socio: "Número socio",
  grupo: "Grupo",
  tel_madre: "Tel. madre",
  tel_padre: "Tel. padre",
};

export interface JanijDetailModalProps {
  open: boolean;
  janij: JanijSummary | null;
  onClose: () => void;
  values?: Partial<Record<JanijDetailField, string>>;
  onFieldChange?: (field: JanijDetailField, value: string) => void;
  readOnly?: boolean;
  sheetNotice?: string;
  showSave?: boolean;
  onSave?: () => void;
  onCall?: () => void;
  callDisabled?: boolean;
}

export default function JanijDetailModal({
  open,
  janij,
  onClose,
  values,
  onFieldChange,
  readOnly = false,
  sheetNotice,
  showSave = false,
  onSave,
  onCall,
  callDisabled,
}: JanijDetailModalProps) {
  const resolveValue = (field: JanijDetailField) => {
    const override = values?.[field];
    if (typeof override === "string") return override;
    const fallback = janij?.[field];
    return fallback ?? "";
  };

  const isReadOnly = readOnly || typeof onFieldChange !== "function";

  return (
    <Modal open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{janij?.nombre ?? "Detalles del janij"}</ModalTitle>
          <ModalDescription>Información del janij</ModalDescription>
        </ModalHeader>
        <div className="space-y-4 text-sm">
          {sheetNotice && (
            <p className="text-xs text-blue-600">
              {sheetNotice}
            </p>
          )}
          {(Object.keys(fieldLabels) as JanijDetailField[]).map((field) => (
            <label key={field} className="flex flex-col">
              <span className="font-medium">{fieldLabels[field]}</span>
              <input
                className="w-full border rounded-lg p-2"
                value={resolveValue(field)}
                readOnly={isReadOnly}
                onChange={(event) =>
                  onFieldChange?.(field, event.target.value)
                }
              />
            </label>
          ))}
        </div>
        <ModalFooter className="flex-wrap sm:flex-nowrap">
          {showSave && onSave && (
            <Button
              variant="success"
              onClick={onSave}
              icon={<Check className="w-4 h-4" />}
            >
              Guardar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {onCall && (
            <Button
              variant="danger"
              onClick={onCall}
              disabled={callDisabled}
              icon={<PhoneCall className="w-4 h-4" />}
            >
              Llamar
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
