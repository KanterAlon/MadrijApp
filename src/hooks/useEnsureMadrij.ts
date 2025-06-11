"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

export default function useEnsureMadrij() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (!user || !isSignedIn) return;

    const syncMadrij = async () => {
      const { error } = await supabase.from("madrijim").upsert(
        {
          clerk_id: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          nombre: user.firstName || "",
        },
        { onConflict: "clerk_id" }
      );

      if (error) {
        console.error("Error inserting madrij:", error);
      }
    };

    syncMadrij();
  }, [user, isSignedIn]);
}
