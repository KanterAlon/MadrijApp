import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

/**
 * Persists sidebar links for each user in localStorage.
 */
export function useSidebarLinks() {
  const { user } = useUser();
  const key = user ? `sidebar-links-${user.id}` : null;
  const [links, setLinks] = useState<string[]>([]);

  // Load from localStorage when the user is available
  useEffect(() => {
    if (!key) return;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setLinks(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    }
  }, [key]);

  // Persist to localStorage whenever links change
  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(links));
    } catch {
      /* ignore */
    }
  }, [key, links]);

  const addLink = useCallback((href: string) => {
    setLinks((prev) => (prev.includes(href) ? prev : [...prev, href]));
  }, []);

  const removeLink = useCallback((href: string) => {
    setLinks((prev) => prev.filter((l) => l !== href));
  }, []);

  return { links, addLink, removeLink };
}

