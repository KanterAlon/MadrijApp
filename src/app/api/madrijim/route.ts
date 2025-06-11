import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { query, names } = await req.json();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !query || !Array.isArray(names)) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // ⚠️ Limitar la lista de nombres si es muy grande (para evitar superar tokens)
  const MAX_NAMES = 500;
  const trimmedNames = names.slice(0, MAX_NAMES);

  const system = `
Sos un asistente que sugiere coincidencias de nombres. 
Te doy un nombre posiblemente mal escrito y una lista de nombres reales.
Devolveme las 5 coincidencias más probables, en orden de mejor a peor, en formato JSON:
{"matches": ["nombre1", "nombre2", "nombre3", "nombre4", "nombre5"]}
No expliques nada más. Solo respondé con el JSON.
  `.trim();

  const userPrompt = `Nombre buscado: ${query}\nLista: ${trimmedNames.join("; ")}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo-0125",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
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
  } catch (err) {
    console.error("Error parseando respuesta:", err, data.choices?.[0]?.message?.content);
    return NextResponse.json({ matches: [] });
  }
}
