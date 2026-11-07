"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase";
import Notification from "../../../../components/ui/Notification";
import { TableSkeleton } from "../../../../components/ui/PageSkeleton";

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  user_access: { payment_status: string; expires_at: string; packages: { name: string } | null }[];
};

export default function Page() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from("profiles")
      .select("id, first_name, last_name, created_at, user_access(payment_status, expires_at, packages(name))")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setRows((data ?? []) as unknown as UserRow[]);
        setLoading(false);
      });
  }, []);

  const activePackage = (row: UserRow) =>
    row.user_access.find((a) => a.payment_status === "paid" && new Date(a.expires_at) > new Date());

  return (
    <main className="p-6">
      <h1 className="font-display text-2xl font-extrabold text-lime">Gebruikers</h1>
      <p className="mt-1 text-sm text-paper/55">Overzicht van alle leerlingen en hun actieve pakket.</p>
      {error && <Notification onDismiss={() => setError(null)}>{error}</Notification>}
      {loading ? <div className="mt-6"><TableSkeleton /></div> : <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-paper/60">
            <tr>
              <th className="px-4 py-3">Naam</th>
              <th className="px-4 py-3">Pakket</th>
              <th className="px-4 py-3">Geldig tot</th>
              <th className="px-4 py-3">Aangemeld</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const access = activePackage(row);
              return (
                <tr key={row.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold">{[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td className="px-4 py-3">{access?.packages?.name ?? <span className="text-paper/40">Geen</span>}</td>
                  <td className="px-4 py-3">{access ? new Date(access.expires_at).toLocaleDateString("nl-NL") : "—"}</td>
                  <td className="px-4 py-3">{new Date(row.created_at).toLocaleDateString("nl-NL")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>}
    </main>
  );
}
