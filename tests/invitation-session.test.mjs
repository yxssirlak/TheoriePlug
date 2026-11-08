import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { activateInvitation, clearInvitation } from "../src/lib/invitation-session.ts";

function setup(userId = "student-1") {
  const items = new Map();
  const storage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
  };
  const calls = [];
  const client = { auth: {
    setSession: async (tokens) => { calls.push(tokens); return { data: { user: { id: userId } }, error: null }; },
    getUser: async () => ({ data: { user: { id: userId } }, error: null }),
  } };
  return { storage, client, calls };
}

test("invite-tokens worden als sessie ingesteld en een vernieuwde pagina blijft bruikbaar", async () => {
  const { storage, client, calls } = setup();
  const url = new URL("https://example.com/uitnodiging#access_token=access&refresh_token=refresh&type=invite");
  assert.equal(await activateInvitation(client, url, storage), "student-1");
  assert.deepEqual(calls, [{ access_token: "access", refresh_token: "refresh" }]);
  assert.equal(await activateInvitation(client, new URL("https://example.com/uitnodiging"), storage), "student-1");
  clearInvitation(storage);
  await assert.rejects(activateInvitation(client, new URL("https://example.com/uitnodiging"), storage), /ongeldig of verlopen/);
});

test("bestaande sessies en andere linktypes worden niet voor uitnodigingen gebruikt", async () => {
  const { storage, client } = setup();
  await assert.rejects(activateInvitation(client, new URL("https://example.com/uitnodiging"), storage));
  await assert.rejects(activateInvitation(client, new URL("https://example.com/uitnodiging#access_token=a&refresh_token=b&type=recovery"), storage));
  await assert.rejects(activateInvitation(client, new URL("https://example.com/uitnodiging#type=invite&access_token=a"), storage));
});

test("ongeldige links en veranderde gebruikers kunnen geen wachtwoord instellen", async () => {
  const { storage, client } = setup();
  const url = new URL("https://example.com/uitnodiging#access_token=a&refresh_token=b&type=invite");
  client.auth.setSession = async () => ({ data: { user: null }, error: new Error("expired") });
  await assert.rejects(activateInvitation(client, url, storage), /ongeldig of verlopen/);
  client.auth.setSession = async () => ({ data: { user: { id: "student-1" } }, error: null });
  await activateInvitation(client, url, storage);
  client.auth.getUser = async () => ({ data: { user: { id: "someone-else" } }, error: null });
  await assert.rejects(activateInvitation(client, new URL("https://example.com/uitnodiging"), storage));
  client.auth.getUser = async () => ({ data: { user: { id: "student-1" } }, error: null });
  await assert.rejects(activateInvitation(client, new URL("https://example.com/uitnodiging#error=access_denied"), storage));
  await assert.rejects(activateInvitation(client, new URL("https://example.com/uitnodiging"), storage));
});

test("Supabase SDK accepteert invite-sessie en verstuurt het nieuwe wachtwoord", async () => {
  const { storage } = setup();
  const user = { id: "14f3eb74-1d11-43ad-8861-1f3a2ebf4580", aud: "authenticated", role: "authenticated" };
  const jwt = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"),
    Buffer.from("signature").toString("base64url"),
  ].join(".");
  const calls = [];
  const client = createClient("https://example.invalid", "test-key", {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false, flowType: "pkce" },
    global: { fetch: async (url, options) => {
      calls.push({ url: String(url), method: options.method, body: options.body });
      if (String(url) !== "https://example.invalid/auth/v1/user") throw new Error("Onverwachte URL");
      return Response.json(user);
    } },
  });
  const inviteUrl = new URL(`https://example.com/uitnodiging#type=invite&access_token=${jwt}&refresh_token=refresh`);
  assert.equal(await activateInvitation(client, inviteUrl, storage), user.id);
  const { error } = await client.auth.updateUser({ password: "Test12345" });
  assert.equal(error, null);
  assert.equal(calls.filter((call) => call.method === "GET").length, 2);
  const update = calls.find((call) => call.method === "PUT");
  assert.equal(JSON.parse(update.body).password, "Test12345");
});
