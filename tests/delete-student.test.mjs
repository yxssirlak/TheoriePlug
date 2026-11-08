import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteStudent } from "../src/lib/delete-student.ts";

function mockService(targetAdmin = null, targetError = null, deleteError = null) {
  const deleted = [];
  const service = {
    from: (table) => {
      assert.equal(table, "admins");
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: targetAdmin, error: targetError }) }) }) };
    },
    auth: { admin: { deleteUser: async (id) => { deleted.push(id); return { error: deleteError }; } } },
  };
  return { service, deleted };
}

test("eigen account en andere beheerders worden niet verwijderd", async () => {
  const own = mockService();
  assert.equal((await deleteStudent(own.service, "actor", "actor")).status, 403);
  assert.deepEqual(own.deleted, []);
  const admin = mockService({ user_id: "admin" });
  assert.equal((await deleteStudent(admin.service, "actor", "admin")).status, 403);
  assert.deepEqual(admin.deleted, []);
});

test("een leerling wordt alleen verwijderd na geslaagde beheerderscontrole", async () => {
  const student = mockService();
  assert.equal((await deleteStudent(student.service, "actor", "student")).status, 200);
  assert.deepEqual(student.deleted, ["student"]);
  const failed = mockService(null, { message: "database error" });
  assert.equal((await deleteStudent(failed.service, "actor", "student")).status, 500);
  assert.deepEqual(failed.deleted, []);
});

test("fouten en onbekende resultaten worden niet als succesvol gepresenteerd", async () => {
  const failed = mockService(null, null, { message: "foreign key constraint" });
  assert.equal((await deleteStudent(failed.service, "actor", "student")).status, 500);
  const uncertain = mockService();
  uncertain.service.auth.admin.deleteUser = async () => { throw new Error("network error"); };
  assert.equal((await deleteStudent(uncertain.service, "actor", "student")).status, 502);
});
