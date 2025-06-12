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
      const el = document.getElementById(`${prefix}${id}`);
      if (!el) return;

      const startHighlight = () => {
        setHighlightId(id);
        if (timeout > 0) {
          setTimeout(() => setHighlightId(null), timeout);
        }
      };

      let handled = false;
      const handleScrollEnd = () => {
        if (handled) return;
        handled = true;
        startHighlight();
        document.removeEventListener("scrollend", handleScrollEnd);
      };

      document.addEventListener("scrollend", handleScrollEnd, { once: true });

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Fallback for browsers without the scrollend event
      setTimeout(handleScrollEnd, 500);
    },
    [prefix, timeout]
  );

  return { highlightId, scrollTo };
}
