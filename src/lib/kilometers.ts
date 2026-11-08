export const RATE_CENTS_PER_KM = 25;

export type Driver = "Yassir" | "Danté";

export type BusinessTrip = {
  id: string;
  trip_date: string;
  driver: Driver;
  start_address: string;
  destination_address: string;
  purpose: string;
  return_trip: boolean;
  distance_meters: number;
  total_cost_cents: number;
};

export function calculateTrip(oneWayMeters: number, returnTrip: boolean) {
  if (!Number.isSafeInteger(oneWayMeters) || oneWayMeters < 0) {
    throw new Error("Ongeldige routeafstand.");
  }
  const distanceMeters = oneWayMeters * (returnTrip ? 2 : 1);
  return {
    distanceMeters,
    totalCostCents: Math.round((distanceMeters * RATE_CENTS_PER_KM) / 1000),
  };
}

function csvCell(value: string) {
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportToCsv(trips: BusinessTrip[]) {
  const rows = [
    [
      "Datum",
      "Bestuurder",
      "Startlocatie",
      "Bestemming",
      "Doel",
      "Afstand (km)",
      "Bedrag (€)",
      "Retour (J/N)",
    ],
    ...trips.map((trip) => [
      trip.trip_date,
      trip.driver || "Yassir",
      trip.start_address,
      trip.destination_address,
      trip.purpose,
      (trip.distance_meters / 1000).toFixed(1).replace(".", ","),
      (trip.total_cost_cents / 100).toFixed(2).replace(".", ","),
      trip.return_trip ? "J" : "N",
    ]),
  ];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(";")).join("\r\n") +
    "\r\n"
  );
}