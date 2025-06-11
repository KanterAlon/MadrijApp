import { NextResponse } from "next/server";
import fuzzysort from "fuzzysort";

export async function POST(req: Request) {
  const { query, names } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !query || !Array.isArray(names)) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // 👉 1. Fuzzy search local con fuzzysort
  const localMatches = fuzzysort.go(query, names, {
    limit: 5,
    threshold: -1000, // más alto = más permisivo
  });

  const localResults = localMatches.map((r) => r.target);

  // ✅ Si hay al menos 3 coincidencias buenas, devolvémoslas directamente
  if (localResults.length >= 3) {
    return NextResponse.json({ matches: localResults });
  }

  // 👉 2. Fallback a OpenAI solo si fuzzysort no encontró suficientes
  const system =
    "Sos un asistente que sugiere coincidencias de nombres. Te doy un nombre posiblemente mal escrito y una lista de nombres reales. Respondé solo en JSON con las 5 coincidencias más probables. Formato: {\"matches\": [\"nombre1\", \"nombre2\"]}.";

  const messages = [
    { role: "system", content: system },
    {
      role: "user",
      content: `Nombre buscado: ${query}\nLista JSON: ${JSON.stringify(
        names.slice(0, 1000)
      )}`, // limitar la lista para evitar truncamiento
    },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0,
        response_format: "json",
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      console.error("OpenAI error:", msg);
      return NextResponse.json({ matches: localResults });
    }

    const data = await res.json();
    const json = JSON.parse(data.choices[0].message.content);

    // Combinar sin duplicados
    const merged = [
      ...new Set([...localResults, ...(json.matches || [])]),
    ].slice(0, 5);

    return NextResponse.json({ matches: merged });
  } catch (err) {
    console.error("Error fallback IA:", err);
    return NextResponse.json({ matches: localResults });
  }
}
