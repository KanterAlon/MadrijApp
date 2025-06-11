"use client";
import { useState, useCallback } from "react";

type Options = {
  timeout?: number;
  prefix?: string;
};

export default function useHighlightScroll({ timeout = 2000, prefix = "" }: Options = {}) {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const scrollTo = useCallback(
    (id: string) => {
      setHighlightId(id);
      const el = document.getElementById(`${prefix}${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (timeout > 0) {
        setTimeout(() => setHighlightId(null), timeout);
      }
    },
    [timeout, prefix]
  );

  return { highlightId, scrollTo };
}
