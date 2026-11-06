import { z } from "zod";

const geocodeSchema = z.object({
  features: z.array(z.object({
    geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
    properties: z.object({ label: z.string().min(1) }),
  })),
});

const routeSchema = z.object({
  routes: z.array(z.object({ summary: z.object({ distance: z.number().finite().nonnegative() }) })),
});

export async function calculateDrivingDistance(start: string, destination: string) {
  // Zet OPENROUTESERVICE_API_KEY uitsluitend op de server, bijvoorbeeld in .env.local.
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) throw new Error("De routeservice is niet ingesteld: OPENROUTESERVICE_API_KEY ontbreekt.");
  const apiKey: string = key;

  async function geocode(address: string) {
    const url = new URL("https://api.openrouteservice.org/geocode/search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("text", address);
    url.searchParams.set("size", "1");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Adressen opzoeken is mislukt bij de routeservice.");
    const parsed = geocodeSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("De routeservice gaf een ongeldig adresresultaat.");
    const result = parsed.data.features[0];
    if (!result) throw new Error(`Adres niet gevonden: ${address}`);
    return result;
  }

  const [origin, target] = await Promise.all([geocode(start), geocode(destination)]);
  const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/json", {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: [origin.geometry.coordinates, target.geometry.coordinates] }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Er kon geen autoroute worden berekend. Controleer de adressen en probeer opnieuw.");
  const parsed = routeSchema.safeParse(await response.json());
  const distance = parsed.success ? parsed.data.routes[0]?.summary.distance : undefined;
  if (distance === undefined || distance > 100000000) throw new Error("De routeservice gaf geen geldige afstand.");
  return {
    oneWayMeters: Math.round(distance),
    resolvedStart: origin.properties.label,
    resolvedDestination: target.properties.label,
  };
}
