import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { query, names } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !query || !Array.isArray(names)) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const system =
    "Sos un asistente que sugiere coincidencias de nombres. Te doy un nombre escrito posiblemente de forma incorrecta y una lista de nombres reales. Respondé en formato JSON con las 5 coincidencias más probables, en orden de mejor a peor. El formato exacto debe ser {\"matches\": [\"nombre1\", \"nombre2\"]}.";

  const messages = [
    { role: "system", content: system },
    {
      role: "user",
      content: `Nombre buscado: ${query}\nLista: ${names.join("; ")}`,
    },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo-0125",
      messages,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    console.error("OpenAI error", msg);
    return NextResponse.json({ error: "OpenAI error" }, { status: 500 });
  }

  const data = await res.json();
  try {
    const json = JSON.parse(data.choices[0].message.content);
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ matches: [] });
  }
}
