import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { calculateTrip, exportToCsv } from "../src/lib/kilometers.ts";
import { calculateDrivingDistance } from "../src/lib/kilometer-routing.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENROUTESERVICE_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENROUTESERVICE_API_KEY;
  else process.env.OPENROUTESERVICE_API_KEY = originalKey;
});

test("berekent enkele reis, retour en afronding per cent", () => {
  assert.deepEqual(calculateTrip(12345, false), { distanceMeters: 12345, totalCostCents: 284 });
  assert.deepEqual(calculateTrip(12345, true), { distanceMeters: 24690, totalCostCents: 568 });
  assert.deepEqual(calculateTrip(500, false), { distanceMeters: 500, totalCostCents: 12 });
  assert.throws(() => calculateTrip(-1, false));
});

test("exporteert CSV met Excel-veilige tekst, escapes en decimale komma", () => {
  const csv = exportToCsv([{
    id: "1", trip_date: "2026-01-02", start_address: '=1+1',
    destination_address: 'Straat "A"; 1', purpose: "Klant\nbezoek",
    distance_meters: 24690, total_cost_cents: 568, return_trip: true,
  }]);
  assert.ok(csv.startsWith("\uFEFF\"Date\";"));
  assert.ok(csv.includes("\"'=1+1\";\"Straat \"\"A\"\"; 1\";\"Klant\nbezoek\";\"24,690\";\"5,68\";\"Y\""));
});

test("geocodeert beide adressen en haalt de rijafstand op", async () => {
  process.env.OPENROUTESERVICE_API_KEY = "test-key";
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/geocode/search")) {
      const text = new URL(url).searchParams.get("text");
      return Response.json({ features: [{ geometry: { coordinates: [4, 52] }, properties: { label: text } }] });
    }
    return Response.json({ routes: [{ summary: { distance: 12345.6 } }] });
  };
  assert.deepEqual(await calculateDrivingDistance("Start", "Eind"), {
    oneWayMeters: 12346, resolvedStart: "Start", resolvedDestination: "Eind",
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[2].options.headers.Authorization, "test-key");
  assert.deepEqual(JSON.parse(calls[2].options.body).coordinates, [[4, 52], [4, 52]]);
});

test("rapporteert ontbrekende sleutel, onbekende adressen en routefouten", async () => {
  delete process.env.OPENROUTESERVICE_API_KEY;
  await assert.rejects(calculateDrivingDistance("Start", "Eind"), /OPENROUTESERVICE_API_KEY/);
  process.env.OPENROUTESERVICE_API_KEY = "test-key";
  globalThis.fetch = async () => Response.json({ features: [] });
  await assert.rejects(calculateDrivingDistance("Start", "Eind"), /Adres niet gevonden/);
  globalThis.fetch = async (url) => String(url).includes("/geocode/search")
    ? Response.json({ features: [{ geometry: { coordinates: [4, 52] }, properties: { label: "Adres" } }] })
    : new Response(null, { status: 500 });
  await assert.rejects(calculateDrivingDistance("Start", "Eind"), /geen autoroute/);
});
