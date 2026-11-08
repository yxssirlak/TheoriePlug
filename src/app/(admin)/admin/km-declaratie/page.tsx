"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import PageSkeleton, { TableSkeleton } from "../../../../components/ui/PageSkeleton";
import { createClient } from "../../../../lib/supabase";
import { calculateTrip, exportToCsv, type BusinessTrip, type Driver } from "../../../../lib/kilometers";
import GlassDatePicker from "../../../../components/dashboard/GlassDatePicker";
import Notification from "../../../../components/ui/Notification";
import GlassSelect from "../../../../components/ui/GlassSelect";

type RouteResult = {
  oneWayMeters: number;
  resolvedStart: string;
  resolvedDestination: string;
};

type PeriodPreset = "all" | "this_month" | "last_3_months" | "last_6_months" | "this_year" | "custom";

const inputClass = "mt-1 w-full rounded-xl border border-white/10 bg-surface-raised px-3 py-2 text-paper outline-none focus:border-lime";
// 2. Slim adresveld met dropdown van eerder gebruikte adressen
// 2. Slim adresveld met dropdown van favoriete en eerder gebruikte adressen
function AddressInput({
  value,
  onChange,
  suggestions,
  favorites,
  onToggleFavorite,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  favorites: string[];
  onToggleFavorite: (addr: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const trimmedValue = value.trim();
  const isCurrentFav = trimmedValue.length >= 3 && favSet.has(trimmedValue);

  const { favList, recentList } = useMemo(() => {
    const q = trimmedValue.toLowerCase();
    const all = Array.from(new Set([...favorites, ...suggestions]));
    const matching = q ? all.filter((s) => s.toLowerCase().includes(q)) : all;

    return {
      favList: matching.filter((s) => favSet.has(s)),
      recentList: matching.filter((s) => !favSet.has(s)),
    };
  }, [trimmedValue, favorites, suggestions, favSet]);

  const hasDropdownItems = favList.length > 0 || recentList.length > 0;

  return (
    <div ref={ref} className="relative mt-1">
      <div className="relative flex items-center">
        <input
          className="w-full rounded-xl border border-white/10 bg-surface-raised py-2 pl-3 pr-16 text-sm font-normal text-paper outline-none transition hover:border-white/20 focus:border-lime"
          required
          minLength={3}
          maxLength={250}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
        />
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {trimmedValue.length >= 3 && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onToggleFavorite(trimmedValue)}
              className={`transition ${
                isCurrentFav ? "text-amber-400 hover:text-amber-300" : "text-paper/30 hover:text-amber-400"
              }`}
              title={isCurrentFav ? "Verwijder uit favorieten" : "Opslaan als favoriet adres"}
            >
              <svg className="h-4 w-4" fill={isCurrentFav ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
          {(suggestions.length > 0 || favorites.length > 0) && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setOpen((prev) => !prev)}
              className="text-paper/50 transition hover:text-lime"
              title="Kies uit adressen"
            >
              <svg className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180 text-lime" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {open && hasDropdownItems && (
        <ul className="absolute z-50 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-paper/20 bg-surface p-1.5 shadow-2xl">
          {favList.length > 0 && (
            <>
              <li className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
                ★ Favoriete adressen
              </li>
              {favList.map((addr) => (
                <li
                  key={`fav-${addr}`}
                  onClick={() => {
                    onChange(addr);
                    setOpen(false);
                  }}
                  className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-normal text-paper transition hover:bg-lime/15 hover:text-lime"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <svg className="h-3.5 w-3.5 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="truncate font-medium">{addr}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(addr);
                    }}
                    className="shrink-0 rounded p-1 text-amber-400 transition hover:bg-white/10"
                    title="Verwijder uit favorieten"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </li>
              ))}
            </>
          )}

          {recentList.length > 0 && (
            <>
              <li className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-paper/40 ${favList.length > 0 ? "mt-1 border-t border-paper/10 pt-2" : ""}`}>
                Eerder gebruikte adressen
              </li>
              {recentList.map((addr) => (
                <li
                  key={`rec-${addr}`}
                  onClick={() => {
                    onChange(addr);
                    setOpen(false);
                  }}
                  className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-normal text-paper/90 transition hover:bg-lime/15 hover:text-lime"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <svg className="h-3.5 w-3.5 shrink-0 text-lime/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{addr}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(addr);
                    }}
                    className="shrink-0 rounded p-1 text-paper/30 transition hover:bg-white/10 hover:text-amber-400"
                    title="Maak favoriet"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
}

const buttonClass = "rounded-xl bg-lime px-4 py-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50";

// Aangepast naar 1 decimaal (bijv. 81,3 km)
const formatDistance = (meters: number) =>
  (meters / 1000).toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatMoney = (cents: number) =>
  (cents / 100).toLocaleString("nl-NL", { style: "currency", currency: "EUR" });

async function fetchTrips(): Promise<BusinessTrip[]> {
  const supabase = createClient();
  const all: BusinessTrip[] = [];
  const pageSize = 500;
  let lastId: string | null = null;
  for (;;) {
    let query = supabase
      .from("business_trips")
      .select("id, trip_date, driver, start_address, destination_address, purpose, return_trip, distance_meters, total_cost_cents")
      .order("id", { ascending: true })
      .limit(pageSize);
    if (lastId) query = query.gt("id", lastId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (data.length === 0) {
      return all.sort((a, b) => b.trip_date.localeCompare(a.trip_date) || a.id.localeCompare(b.id));
    }
    all.push(...(data as BusinessTrip[]));
    lastId = data[data.length - 1].id;
  }
}

function KilometerDeclaratieContent() {
  // Formulier states
  const [date, setDate] = useState("");
  const [driver, setDriver] = useState<Driver>("Yassir");
  const [start, setStart] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [returnTrip, setReturnTrip] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);

  // Data & UI states
  const [trips, setTrips] = useState<BusinessTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filter states
  const [filterDriver, setFilterDriver] = useState<"ALL" | Driver>("ALL");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filterReturn, setFilterReturn] = useState<"ALL" | "YES" | "NO">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadTrips = useCallback(
    () =>
      fetchTrips()
        .then(
          (all) => setTrips(all),
          (caught: unknown) => {
            setTrips([]);
            setError(`Ritten ophalen mislukt: ${caught instanceof Error ? caught.message : "onbekende fout"}`);
          }
        )
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setRoute(null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/km-declaratie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, destination }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Routeberekening mislukt.");
      setRoute(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Routeberekening mislukt.");
    } finally {
      setBusy(false);
    }
  }

  
  async function saveTrip() {
    if (!route || !date || !purpose.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { error: saveError } = await createClient().from("business_trips").insert({
        trip_date: date,
        driver,
        start_address: start.trim(),
        destination_address: destination.trim(),
        resolved_start: route.resolvedStart,
        resolved_destination: route.resolvedDestination,
        purpose: purpose.trim(),
        one_way_meters: route.oneWayMeters,
        return_trip: returnTrip,
      });
      if (saveError) throw new Error(saveError.message);
      setRoute(null);
      setStart("");
      setDestination("");
      setPurpose("");
      setReturnTrip(false);
      setMessage("Rit opgeslagen.");
      setLoading(true);
      await loadTrips();
    } catch (caught) {
      setError(`Rit opslaan mislukt: ${caught instanceof Error ? caught.message : "onbekende fout"}`);
    } finally {
      setBusy(false);
    }
  }
  

  // Gefilterde ritten berekenen
  // Unieke lijst van eerder gebruikte adressen (voor de adres-dropdowns)
  const savedAddresses = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => {
      if (t.start_address?.trim()) set.add(t.start_address.trim());
      if (t.destination_address?.trim()) set.add(t.destination_address.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "nl-NL"));
  }, [trips]);

  // Favoriete adressen beheren (wordt opgeslagen in localStorage)
  const [favoriteAddresses, setFavoriteAddresses] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("km_favorite_addresses");
      if (stored) setFavoriteAddresses(JSON.parse(stored));
    } catch {
      // Negeer leesfouten
    }
  }, []);

  const toggleFavoriteAddress = useCallback((address: string) => {
    const clean = address.trim();
    if (!clean) return;
    setFavoriteAddresses((prev) => {
      const next = prev.includes(clean)
        ? prev.filter((a) => a !== clean)
        : [...prev, clean].sort((a, b) => a.localeCompare(b, "nl-NL"));
      try {
        localStorage.setItem("km_favorite_addresses", JSON.stringify(next));
      } catch {
        // Negeer opslagfouten
      }
      return next;
    });
  }, []);
  const filteredTrips = useMemo(() => {
    const now = new Date();
    const toIsoDate = (d: Date) => d.toISOString().split("T")[0];

    let minDate = "";
    let maxDate = "";

    if (periodPreset === "this_month") {
      minDate = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (periodPreset === "last_3_months") {
      minDate = toIsoDate(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
    } else if (periodPreset === "last_6_months") {
      minDate = toIsoDate(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
    } else if (periodPreset === "this_year") {
      minDate = `${now.getFullYear()}-01-01`;
    } else if (periodPreset === "custom") {
      minDate = customStartDate;
      maxDate = customEndDate;
    }

    const query = searchQuery.trim().toLowerCase();

    return trips.filter((trip) => {
      const tripDriver = trip.driver || "Yassir";
      if (filterDriver !== "ALL" && tripDriver !== filterDriver) return false;
      if (minDate && trip.trip_date < minDate) return false;
      if (maxDate && trip.trip_date > maxDate) return false;
      if (filterReturn === "YES" && !trip.return_trip) return false;
      if (filterReturn === "NO" && trip.return_trip) return false;

      if (query) {
        const haystack = `${trip.start_address} ${trip.destination_address} ${trip.purpose} ${tripDriver}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [trips, filterDriver, periodPreset, customStartDate, customEndDate, filterReturn, searchQuery]);

  // Totalen berekenen over de gefilterde ritten
  const totals = useMemo(() => {
    return filteredTrips.reduce(
      (acc, trip) => {
        acc.meters += trip.distance_meters;
        acc.cents += trip.total_cost_cents;
        return acc;
      },
      { meters: 0, cents: 0 }
    );
  }, [filteredTrips]);

  function downloadCsv() {
    const blob = new Blob([exportToCsv(filteredTrips)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `km-declaratie-${filterDriver.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setFilterDriver("ALL");
    setPeriodPreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setFilterReturn("ALL");
    setSearchQuery("");
  }


  const calculated = route ? calculateTrip(route.oneWayMeters, returnTrip) : null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-lime">Km declaratie</h1>
        <p className="mt-1 text-sm text-paper/60">Registreer zakelijke ritten en exporteer ze naar CSV.</p>
      </div>

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-paper/80">
        <p>De routeafstand is een schatting, geen bewijs van werkelijk gereden kilometers. Een retour verdubbelt de heenroute; een afwijkende terugroute wordt niet apart berekend.</p>
        <p className="mt-2">Het vaste tarief is € 0,25 per km (2026, eigen auto). Controleer bij andere jaren en omstandigheden het toepasselijke tarief. Voor een volledige fiscale rittenregistratie zijn aanvullende gegevens nodig, zoals auto, begin- en eindkilometerstand en eventuele afwijkende route. Bewaar die apart.</p>
        <p className="mt-2">Adressen worden voor de berekening naar openrouteservice verstuurd. Controleer de gevonden locaties voordat je opslaat.</p>
      </div>

      {error ? <Notification onDismiss={() => setError(null)}>{error}</Notification> : message && <Notification type="success" onDismiss={() => setMessage(null)}>{message}</Notification>}

      {/* Formulier Nieuwe Rit */}
      <form onSubmit={calculate} className="space-y-4 rounded-2xl border border-white/10 bg-surface p-5">
        <fieldset disabled={busy || loading} className="space-y-4 disabled:opacity-70">
          <h2 className="font-display text-lg font-bold">Nieuwe rit</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold">
  Datum
  <GlassDatePicker value={date} onChange={setDate} />
</label>
            <div className="text-sm font-semibold">
              Bestuurder
              <GlassSelect label="Bestuurder" disabled={busy || loading}
                value={driver}
                onChange={setDriver}
                options={[
                  { value: "Yassir", label: "Yassir" },
                  { value: "Danté", label: "Danté" },
                ]}
              />
            </div>
            <label className="text-sm font-semibold">
              Doel van de rit
              <input className={inputClass} required maxLength={250} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Bijv. klantafspraak" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Startadres
              <AddressInput
                value={start}
                onChange={(val) => {
                  setStart(val);
                  setRoute(null);
                }}
                suggestions={savedAddresses}
                favorites={favoriteAddresses}
                onToggleFavorite={toggleFavoriteAddress}
                placeholder="Kies favoriet/eerder adres of typ nieuw..."
              />
            </label>
            <label className="text-sm font-semibold">
              Bestemmingsadres
              <AddressInput
                value={destination}
                onChange={(val) => {
                  setDestination(val);
                  setRoute(null);
                }}
                suggestions={savedAddresses}
                favorites={favoriteAddresses}
                onToggleFavorite={toggleFavoriteAddress}
                placeholder="Kies favoriet/eerder adres of typ nieuw..."
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={returnTrip} onChange={(event) => setReturnTrip(event.target.checked)} />
            Retour (afstand heenreis × 2)
          </label>
          <button className={buttonClass} type="submit" disabled={busy}>
            {busy ? "Bezig..." : "Bereken afstand"}
          </button>

          {route && calculated && (
            <div className="space-y-3 rounded-xl border border-lime/30 bg-lime/5 p-4">
              <p className="text-sm text-paper/80">
                Gevonden start: {route.resolvedStart}<br />
                Gevonden bestemming: {route.resolvedDestination}
              </p>
              <p className="font-semibold">
                {driver} · {formatDistance(calculated.distanceMeters)} km · {formatMoney(calculated.totalCostCents)}
              </p>
              <button type="button" className={buttonClass} disabled={busy || !date || !purpose.trim()} onClick={saveTrip}>
                Locaties kloppen, rit opslaan
              </button>
            </div>
          )}
        </fieldset>
      </form>

      {/* Overzicht, Filters & Tabel */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Opgeslagen ritten</h2>
          <button type="button" onClick={downloadCsv} disabled={loading || filteredTrips.length === 0} className={buttonClass}>
            Exporteer CSV ({filteredTrips.length})
          </button>
        </div>

        {/* Filterbalk */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-surface p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-xs font-semibold text-paper/70">
              Bestuurder
              <GlassSelect label="Filter bestuurder"
                value={filterDriver}
                onChange={setFilterDriver}
                options={[
                  { value: "ALL", label: "Alle bestuurders (Yassir & Danté)" },
                  { value: "Yassir", label: "Yassir" },
                  { value: "Danté", label: "Danté" },
                ]}
              />
            </div>

            <div className="text-xs font-semibold text-paper/70">
              Periode
              <GlassSelect label="Periode"
                value={periodPreset}
                onChange={setPeriodPreset}
                options={[
                  { value: "all", label: "Alle ritten" },
                  { value: "this_month", label: "Deze maand" },
                  { value: "last_3_months", label: "Afgelopen 3 maanden" },
                  { value: "last_6_months", label: "Afgelopen 6 maanden" },
                  { value: "this_year", label: "Dit jaar" },
                  { value: "custom", label: "Aangepaste datumreeks..." },
                ]}
              />
            </div>

            <div className="text-xs font-semibold text-paper/70">
              Type rit
              <GlassSelect label="Type rit"
                value={filterReturn}
                onChange={setFilterReturn}
                options={[
                  { value: "ALL", label: "Retour & Enkele reis" },
                  { value: "YES", label: "Alleen retour" },
                  { value: "NO", label: "Alleen enkele reis" },
                ]}
              />
            </div>

            <label className="text-xs font-semibold text-paper/70">
              Zoeken (adres of doel)
              <input
                type="text"
                className={inputClass}
                placeholder="Zoek op klant, stad, doel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
          </div>

          {periodPreset === "custom" && (
            <div className="grid gap-4 border-t border-paper/10 pt-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-paper/70">
                Vanaf datum
                <input type="date" className={inputClass} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
              </label>
              <label className="text-xs font-semibold text-paper/70">
                Tot en met datum
                <input type="date" className={inputClass} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
              </label>
            </div>
          )}

          {(filterDriver !== "ALL" || periodPreset !== "all" || filterReturn !== "ALL" || searchQuery !== "") && (
            <div className="flex justify-end">
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-lime hover:underline">
                Filters wissen
              </button>
            </div>
          )}
        </div>

        {/* Totaalkaarten (Samenvatting van huidige filter) */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-surface p-4">
            <p className="text-xs text-paper/60">Aantal ritten (gefilterd)</p>
            <p className="mt-1 font-display text-2xl font-bold text-paper">{filteredTrips.length}</p>
          </div>
          <div className="rounded-2xl border border-lime/30 bg-lime/5 p-4">
            <p className="text-xs text-paper/70">Totaal aantal kilometers</p>
            <p className="mt-1 font-display text-2xl font-bold text-lime">{formatDistance(totals.meters)} km</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface p-4">
            <p className="text-xs text-paper/60">Totaal te declareren bedrag</p>
            <p className="mt-1 font-display text-2xl font-bold text-paper">{formatMoney(totals.cents)}</p>
          </div>
        </div>

        {/* Tabel */}
        {loading ? (
          <TableSkeleton />
        ) : filteredTrips.length === 0 ? (
          <p className="text-sm text-paper/60">Geen ritten gevonden voor deze selectie.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-paper/60">
                <tr>
                  {["Datum", "Wie", "Start", "Bestemming", "Doel", "Afstand", "Bedrag", "Retour"].map((heading) => (
                    <th key={heading} className="px-4 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3">{trip.trip_date}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-lime">
                        {trip.driver || "Yassir"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{trip.start_address}</td>
                    <td className="px-4 py-3">{trip.destination_address}</td>
                    <td className="px-4 py-3">{trip.purpose}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{formatDistance(trip.distance_meters)} km</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatMoney(trip.total_cost_cents)}</td>
                    <td className="px-4 py-3">{trip.return_trip ? "Ja" : "Nee"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-paper/20 bg-white/5 font-semibold">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right text-paper/70">Totaal selectie:</td>
                  <td className="whitespace-nowrap px-4 py-3 text-lime">{formatDistance(totals.meters)} km</td>
                  <td className="whitespace-nowrap px-4 py-3 text-lime">{formatMoney(totals.cents)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
export default function KilometerDeclaratiePage() {
  return (
    <Suspense fallback={<PageSkeleton kind="kilometers" />}>
      <KilometerDeclaratieContent />
    </Suspense>
  );
}
