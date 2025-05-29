import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = body.data;
    const event = body.type;

    if (event !== "user.created") {
      return NextResponse.json({ status: "ignored" });
    }

    const { error } = await supabase.from("madrijim").upsert({
      clerk_id: user.id,
      email: user.email_addresses?.[0]?.email_address ?? "",
      nombre: user.first_name ?? "",
    });

    if (error) throw error;

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR WEBHOOK:", err);
    return new NextResponse("Webhook error", { status: 500 });
  }
}
