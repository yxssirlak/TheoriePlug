import { test } from "node:test";
import assert from "node:assert/strict";
import { adminExamLoadSchema, examSchema, gradeExam, passingScoreForQuestionCount, studentQuestion, validateAttemptProgress } from "../src/lib/exam-simulator.ts";

const ids = Array.from({ length: 10 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
const option = (id, fields = {}) => ({ id, option_text: "Antwoord", image_url: null, is_correct: false, coordinates_x: null, coordinates_y: null, correct_order: null, ...fields });
const question = (type, options, extra = {}) => ({ id: ids[1], question_text: "Vraag", image_url: null, question_type: type, correct_number: null, explanation: "Uitleg", options, ...extra });
const mc = question("multiple_choice", [option(ids[2], { is_correct: true }), option(ids[3])]);
const numeric = question("number", [], { id: ids[4], correct_number: 50 });
const ordering = question("ordering", [1, 2, 3].map((n) => option(ids[n + 5], { coordinates_x: n * 20, coordinates_y: n * 10, correct_order: n })), { id: ids[5], image_url: `${ids[0]}/road.png` });
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fillerQuestions = Array.from({ length: 51 }, (_, index) => question("multiple_choice", [
  option(uuid(1000 + index * 2), { is_correct: true }),
  option(uuid(1001 + index * 2)),
], { id: uuid(100 + index) }));
const exam = { id: ids[0], title: "Examen", description: "", time_limit_minutes: 30, passing_score: 44, allowed_packages: ["boost", "max"], is_published: false, questions: [mc, numeric, ordering] };
const publishableExam = { ...exam, is_published: true, questions: [...exam.questions, ...fillerQuestions.slice(0, 41)] };

test("valideert publicatie, antwoorden en unieke posities", () => {
  assert.equal(examSchema.safeParse(exam).success, true);
  assert.equal(examSchema.safeParse(publishableExam).success, true);
  assert.equal(examSchema.safeParse({ ...exam, is_published: true }).success, true);
  assert.equal(examSchema.safeParse({ ...exam, is_published: true, questions: [] }).success, false);
  assert.equal(examSchema.safeParse({ ...exam, is_published: true, questions: [mc] }).success, true);
  assert.equal(examSchema.safeParse({ ...exam, questions: [...exam.questions, ...fillerQuestions.slice(0, 48)] }).success, false);
  assert.equal(examSchema.safeParse({ ...exam, passing_score: 4 }).success, false);
  assert.equal(examSchema.safeParse({ ...exam, time_limit_minutes: 31 }).success, false);
  const overLimitDraft = { ...exam, questions: [...exam.questions, ...fillerQuestions.slice(0, 48)] };
  assert.equal(adminExamLoadSchema.safeParse(overLimitDraft).success, true);
  assert.equal(examSchema.safeParse(overLimitDraft).success, false);
  assert.equal(examSchema.safeParse({ ...exam, questions: [{ ...mc, options: mc.options.map((item) => ({ ...item, is_correct: true })) }] }).success, false);
  assert.equal(examSchema.safeParse({ ...exam, questions: [{ ...ordering, options: ordering.options.map((item) => ({ ...item, correct_order: 1 })) }] }).success, false);
  assert.equal(examSchema.safeParse({ ...exam, questions: [{ ...ordering, image_url: "../other.png" }] }).success, false);
});

test("geeft tijdens een poging geen antwoorden of uitleg prijs", () => {
  for (const item of exam.questions) {
    assert.doesNotMatch(JSON.stringify(studentQuestion(item)), /correct_order|is_correct|correct_number|explanation/);
    assert.doesNotMatch(JSON.stringify(studentQuestion(item)), /cbr_category|time_limit_seconds/);
  }
  assert.deepEqual(Object.keys(studentQuestion(mc)).sort(), ["id", "image_url", "options", "question_text", "question_type"]);
  const reordered = { ...ordering, options: [...ordering.options].reverse() };
  assert.deepEqual(studentQuestion(ordering).options, studentQuestion(reordered).options);
});

test("valideert opgeslagen antwoorden en markeringen tegen de momentopname", () => {
  const answers = { [mc.id]: ids[2], [numeric.id]: "12,", [ordering.id]: { [ids[6]]: 2 } };
  assert.equal(validateAttemptProgress(exam.questions, answers, [mc.id, ordering.id]), true);
  assert.equal(validateAttemptProgress(exam.questions, { ...answers, [mc.id]: ids[9] }, []), false);
  assert.equal(validateAttemptProgress(exam.questions, { ...answers, [numeric.id]: "12foo" }, []), false);
  assert.equal(validateAttemptProgress(exam.questions, { ...answers, [ordering.id]: { [ids[6]]: 1, [ids[7]]: 1 } }, []), false);
  assert.equal(validateAttemptProgress(exam.questions, { ...answers, [ordering.id]: { [ids[6]]: 4 } }, []), false);
  assert.equal(validateAttemptProgress(exam.questions, answers, [mc.id, mc.id]), false);
  assert.equal(validateAttemptProgress(exam.questions, answers, [ids[9]]), false);
  assert.equal(validateAttemptProgress(exam.questions, { [ids[9]]: "x" }, []), false);
});

test("slaagt met minimaal 44 juiste antwoorden van maximaal 50", () => {
  assert.equal(passingScoreForQuestionCount(1), 1);
  assert.equal(passingScoreForQuestionCount(44), 39);
  assert.equal(passingScoreForQuestionCount(50), 44);
  assert.equal(gradeExam([mc], { [mc.id]: mc.options[0].id }).passed, true);
  assert.equal(gradeExam([mc], {}).passed, false);
  const questions = fillerQuestions.slice(0, 50);
  const answers = Object.fromEntries(questions.map((item, index) => [item.id, item.options[index < 44 ? 0 : 1].id]));
  assert.deepEqual([gradeExam(questions, answers).score, gradeExam(questions, answers).total, gradeExam(questions, answers).passed], [44, 50, true]);
  const fortyThreeCorrect = { ...answers, [questions[43].id]: questions[43].options[1].id };
  assert.deepEqual([gradeExam(questions, fortyThreeCorrect).score, gradeExam(questions, fortyThreeCorrect).passed], [43, false]);
});
