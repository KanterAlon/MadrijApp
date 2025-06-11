import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: text, model: "text-embedding-ada-002" }),
  });
  if (!res.ok) {
    const msg = await res.text();
    console.error("OpenAI error", msg);
    return NextResponse.json({ error: "OpenAI error" }, { status: 500 });
  }
  const data = await res.json();
  const embedding = data.data?.[0]?.embedding as number[];
  return NextResponse.json({ embedding });
}
