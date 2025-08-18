import { pipeline } from '@xenova/transformers';
import removeAccents from 'remove-accents';
import jaroWinkler from 'jaro-winkler';

let embedderPromise: ReturnType<typeof pipeline> | null = null;

export function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedderPromise;
}

export function normalize(s: string): string {
  return removeAccents(s).toLowerCase().trim().replace(/\s+/g, ' ');
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

interface Cache {
  key: string;
  norms: string[];
  vecs: number[][];
}

let cache: Cache | null = null;

export async function matchNames(query: string, names: string[]): Promise<string[]> {
  const embedder = await getEmbedder();
  const cacheKey = JSON.stringify(names);

  if (!cache || cache.key !== cacheKey) {
    const norms = names.map(normalize);
    const vecs: number[][] = [];
    for (const n of norms) {
      const out = await embedder(n, { pooling: 'mean', normalize: true });
      vecs.push(Array.from(out.data));
    }
    cache = { key: cacheKey, norms, vecs };
  }

  const qNorm = normalize(query);
  const qOut = await embedder(qNorm, { pooling: 'mean', normalize: true });
  const qVec = Array.from(qOut.data);

  const scored = names.map((name, i) => {
    const cos = cosine(qVec, cache!.vecs[i]);
    const jw = jaroWinkler(qNorm, cache!.norms[i]);
    const score = 0.85 * cos + 0.15 * jw;
    return { name, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.name);
}
