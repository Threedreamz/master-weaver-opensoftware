import { scorePLZ } from "./market-scorer";

export interface PLZAgentResult {
  countryCode: string;
  postalCode: string;
  success: boolean;
  data: { cityName: string; latitude: number; longitude: number; smeCount: number; population: number; marketScore: number } | null;
  source: "generated" | "geonames" | "destatis";
  error?: string;
  duration: number;
}

export async function runPLZAgent(countryCode: string, postalCode: string, options?: { latitude?: number; longitude?: number; population?: number }): Promise<PLZAgentResult> {
  const start = Date.now();
  const lat = options?.latitude ?? 50 + Math.random() * 10;
  const lng = options?.longitude ?? 5 + Math.random() * 15;
  const pop = options?.population ?? Math.round(5000 + Math.random() * 50000);
  const smeCount = Math.round(pop * (0.02 + Math.random() * 0.03));

  const marketScore = scorePLZ({
    smeCount, population: pop,
    avgRevenueEur: 500000 + Math.random() * 4500000,
    targetNaceMatch: 0.3 + Math.random() * 0.4,
    newRegistrations: Math.round(smeCount * 0.02),
  });

  return {
    countryCode, postalCode, success: true,
    data: { cityName: `${countryCode}-${postalCode}`, latitude: lat, longitude: lng, smeCount, population: pop, marketScore },
    source: "generated", duration: Date.now() - start,
  };
}

export async function runPLZAgentBatch(
  postalCodes: Array<{ countryCode: string; postalCode: string; latitude?: number; longitude?: number }>,
  options?: { maxConcurrent?: number; onProgress?: (result: PLZAgentResult) => void }
): Promise<PLZAgentResult[]> {
  const maxConcurrent = options?.maxConcurrent ?? 20;
  const results: PLZAgentResult[] = [];
  const queue = [...postalCodes];
  const running = new Set<Promise<void>>();

  const processNext = async () => {
    const item = queue.shift();
    if (!item) return;
    const result = await runPLZAgent(item.countryCode, item.postalCode, { latitude: item.latitude, longitude: item.longitude });
    results.push(result);
    options?.onProgress?.(result);
  };

  while (queue.length > 0 || running.size > 0) {
    while (running.size < maxConcurrent && queue.length > 0) {
      const promise = processNext().then(() => { running.delete(promise); });
      running.add(promise);
    }
    if (running.size > 0) await Promise.race(running);
  }
  return results;
}
