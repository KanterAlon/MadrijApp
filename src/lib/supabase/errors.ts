export type PostgrestErrorLike = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message: string;
} | null;

export function isMissingRelationError(error: unknown, relation?: string): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as PostgrestErrorLike & { message?: string };
  const code = maybeError?.code;
  if (code && typeof code === "string" && code.toUpperCase() === "42P01") {
    return true;
  }

  const message = typeof maybeError?.message === "string" ? maybeError.message : null;
  if (!message) {
    return false;
  }

  if (relation && message.toLowerCase().includes(relation.toLowerCase())) {
    return message.toLowerCase().includes("does not exist");
  }

  return message.includes("does not exist");
}
