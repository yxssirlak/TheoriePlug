import { test } from "node:test";
import assert from "node:assert/strict";
import { expiryForSave, invitationAccess, invitationAuthError, invitationExpiry, invitationMetadata, invitationSchema, inviteStudent, localDateTime, STUDENT_PACKAGES, validInvitationPassword } from "../src/lib/admin-users.ts";

const access = { pakket: "MAX", expiresAt: "2030-01-01T12:00:00.000Z" };

test("uitnodiging valideert e-mail en begrenst namen", () => {
  assert.deepEqual(invitationSchema.parse({ email: "  leerling@example.com ", firstName: " Voor ", lastName: "", ...access }), { email: "leerling@example.com", firstName: "Voor", lastName: "", ...access });
  assert.equal(invitationSchema.safeParse({ email: "onjuist", firstName: "", lastName: "", ...access }).success, false);
  assert.equal(invitationSchema.safeParse({ email: "a@example.com", firstName: "a".repeat(101), lastName: "", ...access }).success, false);
  assert.equal(invitationSchema.safeParse({ email: "a@example.com", firstName: "", lastName: "" }).success, false);
  assert.equal(invitationSchema.safeParse({ email: "a@example.com", pakket: "INVALID" }).success, false);
  assert.equal(invitationSchema.safeParse({ email: "a@example.com", firstName: "", lastName: "", ...access, expiresAt: "niet-een-datum" }).success, false);
  assert.deepEqual(invitationSchema.parse({ email: "a@example.com", pakket: "START" }), { email: "a@example.com", pakket: "START", firstName: "", lastName: "" });
});

test("standaardduur en expliciete einddatum worden correct bepaald", () => {
  const now = Date.parse("2030-01-01T12:00:00.000Z");
  for (const [pakket, days] of Object.entries({ START: 7, BOOST: 14, MAX: 31 })) {
    const invite = invitationSchema.parse({ email: "a@example.com", pakket });
    assert.equal(Date.parse(invitationExpiry(invite, now)) - now, days * 86400000);
  }
  assert.equal(invitationExpiry(invitationSchema.parse({ email: "a@example.com", ...access }), now), access.expiresAt);
});

test("uitnodigingsfouten zijn specifiek en verwarren mailfouten niet met bestaande accounts", () => {
  for (const code of ["email_exists", "user_already_exists"]) assert.equal(invitationAuthError(code).status, 409);
  for (const code of ["over_email_send_rate_limit", "over_request_rate_limit"]) assert.equal(invitationAuthError(code).status, 429);
  assert.equal(invitationAuthError("unexpected_failure").status, 502);
  assert.doesNotMatch(invitationAuthError("unexpected_failure").error, /bestaat al/);
});

test("pakketnaam gaat naar het e-mailsjabloon en hetzelfde pakket wordt gekoppeld", async () => {
  const invite = invitationSchema.parse({ email: "a@example.com", firstName: "Ada", lastName: "Test", ...access });
  assert.deepEqual(invitationMetadata(invite), { first_name: "Ada", last_name: "Test", pakket: "MAX" });
  assert.deepEqual(invitationAccess(invite, "user-id", "package-id", access.expiresAt), { p_user_id: "user-id", p_first_name: "Ada", p_last_name: "Test", p_invited: true, p_package_id: "package-id", p_payment_status: "paid", p_expires_at: access.expiresAt });
  let actual;
  const client = { auth: { admin: { inviteUserByEmail: async (...args) => { actual = args; return { data: { user: { id: "user-id" } }, error: null }; } } } };
  for (const pakket of ["START", "BOOST", "MAX"]) {
    const result = await inviteStudent(client, { ...invite, pakket }, "https://example.com/uitnodiging");
    assert.equal(result.data.user.id, "user-id");
    assert.deepEqual(actual, ["a@example.com", { redirectTo: "https://example.com/uitnodiging", data: { first_name: "Ada", last_name: "Test", pakket } }]);
  }
  assert.deepEqual(STUDENT_PACKAGES, { START: 7, BOOST: 14, MAX: 31 });
});

test("uitnodigingswachtwoord volgt dezelfde eisen als checkout", () => {
  assert.equal(validInvitationPassword("abcdefgh"), false);
  assert.equal(validInvitationPassword("12345678"), false);
  assert.equal(validInvitationPassword("abc123"), false);
  assert.equal(validInvitationPassword("abcdefgh1"), true);
});

test("ongewijzigde einddatum behoudt seconden en tijdzone", () => {
  const previous = "2026-11-09T14:23:52.123Z";
  assert.equal(expiryForSave(localDateTime(previous), previous), previous);
  const changed = localDateTime("2026-11-10T14:23:00Z");
  assert.equal(new Date(expiryForSave(changed, previous)).getTime(), new Date(changed).getTime());
  assert.equal(localDateTime("ongeldig"), "");
});
