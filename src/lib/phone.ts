export interface TelHrefOptions {
  /** Optional prefix to prepend before dialing (e.g. private call codes) */
  privatePrefix?: string;
}

/**
 * Normalizes a phone number and returns a tel: href that can be assigned to window.location.
 * Returns null when the input cannot be converted into a valid dial string.
 */
export function buildTelHref(
  rawPhone: string | null | undefined,
  options?: TelHrefOptions,
): string | null {
  if (!rawPhone) return null;
  const sanitized = rawPhone.trim();
  if (!sanitized) return null;

  const clean = sanitized.replace(/[^+\d]/g, "");
  if (!clean) return null;

  const normalized = clean.startsWith("+")
    ? `+${clean.slice(1).replace(/\+/g, "")}`
    : clean.replace(/\+/g, "");

  if (!normalized || normalized === "+") {
    return null;
  }

  const sequence = `${options?.privatePrefix ?? ""}${normalized}`;
  const safeSequence = sequence.replace(/([#*])/g, (char) => encodeURIComponent(char));
  return `tel:${safeSequence}`;
}
