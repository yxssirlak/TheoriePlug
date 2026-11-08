"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/flashcards";
import Notification from "../../../../components/ui/Notification";
import { TableSkeleton } from "../../../../components/ui/PageSkeleton";
import { useDialogs } from "../../../../components/admin/Dialog";
import { expiryForSave, localDateTime, STUDENT_PACKAGES, type StudentPackage } from "../../../../lib/admin-users";

type UserRow = { id: string; email: string; first_name: string | null; last_name: string | null; created_at: string };
type Package = { id: string; name: string; duration_days: number; is_active: boolean | null };
type Access = { id: string; user_id: string; package_id: string; payment_status: string; expires_at: string; created_at: string };
type MutationProfile = { voornaam: string | null; achternaam: string | null };
type MutationAccess = { package_id: string; payment_status: string; expires_at: string };
type Mutation = { id: number; actor_email: string; action: string; details: { profiel_vorige: MutationProfile | null; profiel_nieuw: MutationProfile; toegang_vorige: MutationAccess | null; toegang_nieuw: MutationAccess | null }; created_at: string };
type Message = { type: "success" | "error"; text: string };
const input = "mt-1 w-full rounded-xl border border-white/10 bg-surface-raised px-3 py-2 text-paper outline-none focus:border-lime";
const button = "rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-paper hover:border-lime disabled:opacity-40";
const statuses = [
  { value: "paid", label: "Actief / betaald" }, { value: "pending", label: "In afwachting" },
  { value: "failed", label: "Mislukt" }, { value: "canceled", label: "Geannuleerd" }, { value: "expired", label: "Verlopen" },
];

export default function Page() {
  const [supabase] = useState(createClient);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [access, setAccess] = useState<Access[]>([]);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [logState, setLogState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [invitePackage, setInvitePackage] = useState<StudentPackage | "">("");
  const [inviteExpires, setInviteExpires] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [accessId, setAccessId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [status, setStatus] = useState("paid");
  const [expires, setExpires] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const { confirm, element: dialogs } = useDialogs();

  const load = useCallback(async () => {
    const [directory, packageRows, accessRows] = await Promise.all([
      fetchAllPages<UserRow>((from, to) => supabase.rpc("admin_user_directory").range(from, to)),
      fetchAllPages<Package>((from, to) => supabase.from("packages").select("id,name,duration_days,is_active").order("name").order("id").range(from, to)),
      fetchAllPages<Access>((from, to) => supabase.from("user_access").select("id,user_id,package_id,payment_status,expires_at,created_at").order("created_at", { ascending: false }).order("id").range(from, to)),
    ]);
    setUsers(directory); setPackages(packageRows); setAccess(accessRows);
  }, [supabase]);

  const loadLog = useCallback(async (id: string) => {
    const { data, error } = await supabase.from("admin_user_mutations").select("id,actor_email,action,details,created_at").eq("target_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    if (selectedRef.current === id) { setMutations(data as Mutation[]); setLogState("ready"); }
  }, [supabase]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(load).catch((error: unknown) => { if (active) setMessage({ type: "error", text: error instanceof Error ? error.message : "Gebruikers laden mislukt." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  function chooseUser(user: UserRow) {
    selectedRef.current = user.id;
    setSelectedId(user.id); setFirstName(user.first_name ?? ""); setLastName(user.last_name ?? "");
    setAccessId(""); setPackageId(""); setExpires(""); setStatus("paid"); setMutations([]); setLogState("loading");
    void loadLog(user.id).catch((error: unknown) => { if (selectedRef.current === user.id) { setLogState("error"); setMessage({ type: "error", text: error instanceof Error ? error.message : "Log laden mislukt." }); } });
  }

  function chooseAccess(id: string) {
    setAccessId(id);
    const item = access.find((entry) => entry.id === id);
    setPackageId(item?.package_id ?? "");
    setStatus(item?.payment_status ?? "paid");
    setExpires(item ? localDateTime(item.expires_at) : "");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    if (packageId && (!expires || !Number.isFinite(new Date(expires).getTime()))) {
      setMessage({ type: "error", text: "Vul een geldige einddatum en tijd voor de toegang in." }); return;
    }
    if (packageId && !await confirm({ title: "Pakkettoegang wijzigen?", message: "Dit past de toegang direct aan. Status ‘Actief / betaald’ verleent toegang, maar registreert geen betaling of bestelling.", confirmLabel: "Opslaan", danger: false })) return;
    setBusy(true); setMessage(null);
    const { error } = await supabase.rpc("admin_save_user", {
      p_user_id: selectedId, p_first_name: firstName.trim(), p_last_name: lastName.trim(),
      p_access_id: packageId && accessId ? accessId : null, p_package_id: packageId || null,
      p_payment_status: packageId ? status : null, p_expires_at: packageId ? expiryForSave(expires, access.find((item) => item.id === accessId)?.expires_at) : null,
    });
    if (error) setMessage({ type: "error", text: `Opslaan mislukt: ${error.message}` });
    else {
      try { await Promise.all([load(), loadLog(selectedId)]); chooseAccess(""); setMessage({ type: "success", text: "Gebruiker opgeslagen." }); }
      catch (error) { setMessage({ type: "error", text: `Opgeslagen, maar vernieuwen mislukt: ${error instanceof Error ? error.message : "onbekende fout"}` }); }
    }
    setBusy(false);
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitePackage || !inviteExpires || !Number.isFinite(new Date(inviteExpires).getTime()) || new Date(inviteExpires).getTime() <= Date.now()) {
      setMessage({ type: "error", text: "Kies een actief pakket en een toekomstige einddatum." });
      return;
    }
    if (!await confirm({ title: "Gebruiker uitnodigen?", message: `De gebruiker krijgt direct toegang tot ${invitePackage}. Dit maakt geen betaling of bestelling aan.`, confirmLabel: "Uitnodigen", danger: false })) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/gebruikers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, firstName: inviteFirstName, lastName: inviteLastName, pakket: invitePackage, expiresAt: new Date(inviteExpires).toISOString() }) });
      const result: { error?: string; message?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Uitnodiging mislukt.");
      setEmail(""); setInviteFirstName(""); setInviteLastName(""); setInvitePackage(""); setInviteExpires(""); setShowInvite(false);
      setMessage({ type: "success", text: result.message ?? "Uitnodiging verstuurd." });
      try { await load(); } catch (error) { setMessage({ type: "error", text: `Uitnodiging verstuurd, maar overzicht vernieuwen mislukt: ${error instanceof Error ? error.message : "onbekende fout"}` }); }
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Uitnodiging mislukt." }); }
    finally { setBusy(false); }
  }

  async function removeUser(user: UserRow) {
    if (!await confirm({ title: "Account definitief verwijderen?", message: `${user.email} wordt definitief verwijderd, inclusief pakkettoegang, voortgang, bestellingen en mutatielog. Dit kan niet worden teruggedraaid.`, confirmLabel: "Definitief verwijderen", danger: true })) return;
    setBusy(true); setMessage(null);
    try {
      let response: Response;
      try {
        response = await fetch("/api/admin/gebruikers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) });
      } catch {
        throw new Error("Verwijderen kon niet worden bevestigd. Controleer in Supabase of het account nog bestaat voordat je opnieuw probeert.");
      }
      let result: { error?: string; message?: string };
      try { result = await response.json(); }
      catch { throw new Error("Verwijderen kon niet worden bevestigd. Controleer in Supabase of het account nog bestaat voordat je opnieuw probeert."); }
      if (!response.ok) throw new Error(result.error ?? "Account verwijderen mislukt.");
      selectedRef.current = null; setSelectedId(null); setMutations([]);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setAccess((current) => current.filter((item) => item.user_id !== user.id));
      setMessage({ type: "success", text: result.message ?? "Account verwijderd." });
      try { await load(); } catch (error) { setMessage({ type: "error", text: `Account verwijderd, maar overzicht vernieuwen mislukt: ${error instanceof Error ? error.message : "onbekende fout"}` }); }
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Account verwijderen mislukt." }); }
    finally { setBusy(false); }
  }

  const selected = users.find((user) => user.id === selectedId);
  const visible = users.filter((user) => `${user.first_name ?? ""} ${user.last_name ?? ""} ${user.email}`.toLocaleLowerCase("nl").includes(search.trim().toLocaleLowerCase("nl")));
  const userAccess = access.filter((item) => item.user_id === selectedId);
  const packageAvailability = (name: StudentPackage) => {
    const matches = packages.filter((item) => item.name.toUpperCase() === name);
    if (matches.length === 0) return "ontbreekt in Supabase";
    if (matches.length > 1) return "dubbel in Supabase";
    return matches[0].is_active === false ? "inactief" : null;
  };
  const activeAccess = (userId: string) => access.filter((item) => item.user_id === userId && item.payment_status === "paid" && new Date(item.expires_at).getTime() > Date.now());
  const packageName = (id: string) => packages.find((item) => item.id === id)?.name ?? "Onbekend pakket";
  const profileLabel = (profile: MutationProfile | null) => profile ? [profile.voornaam, profile.achternaam].filter(Boolean).join(" ") || "Geen naam" : "Geen profiel";
  const accessLabel = (item: MutationAccess | null) => item ? `${packageName(item.package_id)} · ${statuses.find((status) => status.value === item.payment_status)?.label ?? item.payment_status} · tot ${new Date(item.expires_at).toLocaleString("nl-NL")}` : "Geen toegang";

  return <main className="p-6">
    {dialogs}
    {message && <Notification type={message.type} onDismiss={() => setMessage(null)}>{message.text}</Notification>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold text-lime">Gebruikers</h1><p className="mt-1 text-sm text-paper/55">Beheer profielen en pakkettoegang. Wijzigingen via dit scherm worden gelogd.</p></div><button type="button" className={button} disabled={busy} onClick={() => setShowInvite(!showInvite)}>+ Gebruiker uitnodigen</button></div>
    {showInvite && <form onSubmit={invite} className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-surface p-5 sm:grid-cols-3">
      <label className="text-sm">E-mailadres<input className={input} type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="text-sm">Voornaam<input className={input} maxLength={100} value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} /></label>
      <label className="text-sm">Achternaam<input className={input} maxLength={100} value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} /></label>
      <label className="text-sm">Pakket<select className={input} required value={invitePackage} onChange={(e) => {
        const value = e.target.value;
        if (value === "START" || value === "BOOST" || value === "MAX") {
          setInvitePackage(value);
          const end = new Date(Math.ceil((Date.now() + STUDENT_PACKAGES[value] * 86400000) / 60000) * 60000);
          setInviteExpires(localDateTime(end.toISOString()));
        } else { setInvitePackage(""); setInviteExpires(""); }
      }}><option value="">Kies een pakket</option>{(Object.keys(STUDENT_PACKAGES) as StudentPackage[]).map((name) => {
        const unavailable = loading ? "laden..." : packageAvailability(name);
        return <option key={name} value={name} disabled={Boolean(unavailable)}>{name} ({STUDENT_PACKAGES[name]} dagen){unavailable ? ` · ${unavailable}` : ""}</option>;
      })}</select></label>
      <label className="text-sm">Toegang geldig tot<input className={input} type="datetime-local" required value={inviteExpires} onChange={(e) => setInviteExpires(e.target.value)} /></label>
      <p className="text-sm text-paper/60 sm:col-span-3">Het pakket wordt in de uitnodiging vermeld en direct toegekend. Dit registreert geen betaling of bestelling. De gebruiker kiest zelf een wachtwoord.</p>
      <button disabled={busy} className="rounded-xl bg-lime px-4 py-2 font-bold text-ink disabled:opacity-40">Uitnodiging versturen</button>
    </form>}
    {loading ? <div className="mt-6"><TableSkeleton /></div> : <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="min-w-0 rounded-2xl border border-white/10 bg-surface p-4">
        <label className="block text-sm">Zoek gebruiker<input type="search" className={input} placeholder="Naam of e-mailadres" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <p className="mt-3 text-xs text-paper/60">{visible.length} van {users.length} gebruikers</p>
        <div className="mt-3 max-h-[42rem] space-y-2 overflow-y-auto">{visible.map((user) => <button type="button" key={user.id} disabled={busy} onClick={() => chooseUser(user)} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedId === user.id ? "border-lime bg-lime/5" : "border-white/10 hover:border-white/30"}`}>
          <strong>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "Naam onbekend"}</strong><span className="block break-all text-paper/60">{user.email}</span><span className="mt-1 block text-xs text-paper/60">{activeAccess(user.id).map((item) => packageName(item.package_id)).join(", ") || "Geen actieve toegang"}</span>
        </button>)}{visible.length === 0 && <p className="p-3 text-sm text-paper/60">Geen gebruikers gevonden.</p>}</div>
      </section>
      {selected ? <section className="min-w-0 space-y-5">
        <form onSubmit={save} className="space-y-4 rounded-2xl border border-white/10 bg-surface p-5">
          <h2 className="font-display text-lg font-bold">Gebruiker bewerken</h2><p className="break-all text-sm text-paper/60">{selected.email}</p>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Voornaam<input className={input} maxLength={100} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label><label className="text-sm">Achternaam<input className={input} maxLength={100} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label></div>
          <h3 className="font-bold">Pakkettoegang</h3>
          <label className="block text-sm">Bestaande toegang<select className={input} value={accessId} onChange={(e) => chooseAccess(e.target.value)}><option value="">Geen wijziging / nieuwe toegang</option>{userAccess.map((item) => <option key={item.id} value={item.id}>{packageName(item.package_id)} · {item.payment_status} · {new Date(item.expires_at).toLocaleString("nl-NL")}</option>)}</select></label>
          <label className="block text-sm">Pakket<select className={input} value={packageId} onChange={(e) => setPackageId(e.target.value)}><option value="">Geen pakkettoegang wijzigen</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.duration_days} dagen){item.is_active === false ? " · inactief" : ""}</option>)}</select></label>
          {packageId && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Status<select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>{!statuses.some((item) => item.value === status) && <option value={status}>{status} (kies een geldige status)</option>}{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-sm">Geldig tot<input className={input} type="datetime-local" required value={expires} onChange={(e) => setExpires(e.target.value)} /></label></div>}
          <p className="text-xs text-paper/60">Actief / betaald verleent toegang tot de gekozen einddatum; dit maakt geen betaling of bestelling aan. Andere actieve pakketten blijven bestaan.</p>
          <button disabled={busy} className="rounded-xl bg-lime px-4 py-2 font-bold text-ink disabled:opacity-40">Wijzigingen opslaan</button>
          <button type="button" disabled={busy} onClick={() => void removeUser(selected)} className="ml-3 rounded-xl border border-red-500/50 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-40">Account verwijderen</button>
        </form>
        <section className="rounded-2xl border border-white/10 bg-surface p-5"><h2 className="font-display text-lg font-bold">Mutatielog</h2><p className="mt-1 text-xs text-paper/60">Laatste 100 wijzigingen via gebruikersbeheer. Wijzigingen elders worden niet getoond.</p>
          <div className="mt-4 space-y-3">{logState === "loading" && <p className="text-sm text-paper/60">Mutaties laden...</p>}{logState === "error" && <p className="text-sm text-red-300">Mutaties konden niet worden geladen.</p>}{logState === "ready" && mutations.map((entry) => <details key={entry.id} className="rounded-xl border border-white/10 p-3 text-sm"><summary className="cursor-pointer font-semibold">{new Date(entry.created_at).toLocaleString("nl-NL")} · {entry.action}</summary><p className="mt-2 break-all text-xs text-paper/60">Beheerder: {entry.actor_email}</p><p className="mt-2 text-paper/70">Naam: {profileLabel(entry.details.profiel_vorige)} → {profileLabel(entry.details.profiel_nieuw)}</p>{entry.details.toegang_nieuw && <p className="mt-1 text-paper/70">Toegang: {accessLabel(entry.details.toegang_vorige)} → {accessLabel(entry.details.toegang_nieuw)}</p>}</details>)}{logState === "ready" && mutations.length === 0 && <p className="text-sm text-paper/60">Nog geen wijzigingen geregistreerd.</p>}</div>
        </section>
      </section> : <p className="rounded-2xl border border-white/10 bg-surface p-6 text-sm text-paper/60">Kies een gebruiker om profiel, pakkettoegang en mutaties te bekijken.</p>}
    </div>}
  </main>;
}
