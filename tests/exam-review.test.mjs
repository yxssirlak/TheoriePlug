import { test } from "node:test";
import assert from "node:assert/strict";
import { examReviewSchema, reviewOrderingAnswer } from "../src/lib/exam-review.ts";

test("nakijken ondersteunt alle vraagtypes en correcte antwoorden", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const base = { id, question_text: "Vraag", image_url: null, explanation: "Uitleg", correct_number: null, options: [] };
  const option = { id, option_text: "Antwoord", image_url: null, is_correct: true, coordinates_x: null, coordinates_y: null, correct_order: null };
  const questions = [
    { ...base, question_type: "multiple_choice", options: [option] },
    { ...base, question_type: "number", correct_number: 50 },
    { ...base, question_type: "ordering", options: [{ ...option, is_correct: false, coordinates_x: 20, coordinates_y: 30, correct_order: 1 }] },
    ...["yes_no", "multiple_response", "single_drag", "hotspot"].map((question_type) => ({ ...base, question_type, options: [option] })),
  ];
  assert.equal(examReviewSchema.safeParse(questions).success, true);
  assert.equal(examReviewSchema.safeParse([{ ...questions[0], options: [{ ...option, is_correct: "true" }] }]).success, false);
});

test("herkent ingevulde en ontbrekende volgorde-antwoorden", () => {
  assert.equal(reviewOrderingAnswer({ a: 2 }, "a"), 2);
  assert.equal(reviewOrderingAnswer({ a: 2 }, "b"), null);
  assert.equal(reviewOrderingAnswer(null, "a"), null);
  assert.equal(reviewOrderingAnswer({ a: "2" }, "a"), null);
});
