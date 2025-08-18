import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

/**
 * Persists sidebar links for each user using Supabase.
 */
export function useSidebarLinks() {
  const { user } = useUser();
  const userId = user?.id;
  const [links, setLinks] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load links from Supabase when the user is available
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("user_sidebar_links")
        .select("links")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      setLinks((data?.links as string[]) ?? []);
      setLoaded(true);
    };
    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  // Persist links to Supabase whenever they change after initial load
  useEffect(() => {
    if (!userId || !loaded) return;
    void supabase
      .from("user_sidebar_links")
      .upsert({ user_id: userId, links });
  }, [userId, loaded, links]);

  const addLink = useCallback((href: string) => {
    setLinks((prev) => (prev.includes(href) ? prev : [...prev, href]));
  }, []);

  const removeLink = useCallback((href: string) => {
    setLinks((prev) => prev.filter((l) => l !== href));
  }, []);

  return { links, addLink, removeLink };
}

