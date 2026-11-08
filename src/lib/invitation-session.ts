import type { SupabaseClient } from "@supabase/supabase-js";

const marker = "theorieplug-invitation-user";
const invalidLink = "De uitnodigingslink is ongeldig of verlopen. Neem contact op met de beheerder.";

export async function activateInvitation(client: SupabaseClient, url: URL, storage: Storage): Promise<string> {
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (fragment.has("error") || fragment.has("error_code") || url.searchParams.has("error") || url.searchParams.has("error_code")) {
    storage.removeItem(marker);
    throw new Error(invalidLink);
  }
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  let expectedUser: string | null;
  if (fragment.get("type") === "invite" && accessToken && refreshToken) {
    storage.removeItem(marker);
    const { data, error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error || !data.user) throw new Error(invalidLink);
    expectedUser = data.user.id;
  } else {
    if (url.hash || url.searchParams.has("code")) throw new Error(invalidLink);
    expectedUser = storage.getItem(marker);
    if (!expectedUser) throw new Error(invalidLink);
  }
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.id !== expectedUser) {
    storage.removeItem(marker);
    throw new Error(invalidLink);
  }
  storage.setItem(marker, data.user.id);
  return data.user.id;
}

export function clearInvitation(storage: Storage) {
  storage.removeItem(marker);
}
