"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

import { supabase } from "@/lib/supabase";

export default function useEnsureMadrij() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (!user || !isSignedIn) return;
    const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
    if (!email) return;

    const syncMadrij = async () => {
      const { error } = await supabase
        .from("madrijim")
        .update({ email })
        .eq("clerk_id", user.id);

      if (error) {
      }
    };

    syncMadrij();
  }, [user, isSignedIn]);
}
