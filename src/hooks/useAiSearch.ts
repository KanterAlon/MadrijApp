import { useState, useCallback } from "react";

export function useAiSearch(names: string[]) {
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setAiResults([]);
        return;
      }

      setAiLoading(true);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, names }),
        });
        const d = await res.json();
        setAiResults(d.matches || []);
      } catch {
        setAiResults([]);
      } finally {
        setAiLoading(false);
      }
    },
    [names]
  );

  const reset = useCallback(() => setAiResults([]), []);

  return { aiResults, aiLoading, search, reset };
}

