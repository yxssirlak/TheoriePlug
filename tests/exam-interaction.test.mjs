import { test } from "node:test";
import assert from "node:assert/strict";
import { answerStatus, placeOrderingNumber, remainingMinutes, removeOrderingNumber } from "../src/lib/exam-interaction.ts";

test("resterende tijd toont hele minuten tot de tijd verstreken is", () => {
  assert.equal(remainingMinutes(1800), 30);
  assert.equal(remainingMinutes(1799), 30);
  assert.equal(remainingMinutes(60), 1);
  assert.equal(remainingMinutes(1), 1);
  assert.equal(remainingMinutes(0), 0);
});

test("sleepnummers blijven uniek en verplaatsen tussen posities", () => {
  const first = placeOrderingNumber({}, "a", 1);
  const moved = placeOrderingNumber(first, "b", 1);
  assert.deepEqual(first, { a: 1 });
  assert.deepEqual(moved, { b: 1 });
  assert.deepEqual(placeOrderingNumber({ a: 2, b: 1 }, "a", 1), { a: 1 });
  assert.deepEqual(removeOrderingNumber({ a: 1, b: 2 }, 1), { b: 2 });
});

test("overzicht onderscheidt lege, gedeeltelijke en ingevulde antwoorden", () => {
  const ordering = { question_type: "ordering", options: [{ id: "a" }, { id: "b" }] };
  assert.equal(answerStatus(ordering, undefined), "empty");
  assert.equal(answerStatus(ordering, {}), "empty");
  assert.equal(answerStatus(ordering, { a: 1 }), "partial");
  assert.equal(answerStatus(ordering, { a: 1, b: 2 }), "answered");
  const number = { question_type: "number", options: [] };
  assert.equal(answerStatus(number, ""), "empty");
  assert.equal(answerStatus(number, "-"), "partial");
  assert.equal(answerStatus(number, "12,5"), "answered");
  assert.equal(answerStatus({ question_type: "multiple_choice", options: [] }, "a"), "answered");
  assert.equal(answerStatus({ question_type: "multiple_response", options: [] }, []), "empty");
  assert.equal(answerStatus({ question_type: "multiple_response", options: [] }, ["a"]), "answered");
  assert.equal(answerStatus({ question_type: "single_drag", options: [] }, "a"), "answered");
  assert.equal(answerStatus({ question_type: "hotspot", options: [] }, undefined), "empty");
});
