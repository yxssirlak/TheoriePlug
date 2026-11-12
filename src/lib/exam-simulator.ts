import { z } from "zod";

export const EXAM_MAX_QUESTIONS = 50;
export const EXAM_PASSING_SCORE = 44;
export const EXAM_TIME_LIMIT_MINUTES = 30;
export const EXAM_QUESTION_TYPES = ["multiple_choice", "yes_no", "multiple_response", "number", "ordering", "single_drag", "hotspot"] as const;

export function passingScoreForQuestionCount(questionCount: number) {
  return questionCount > 0 ? Math.ceil(questionCount * EXAM_PASSING_SCORE / EXAM_MAX_QUESTIONS) : 0;
}

const uuid = z.string().uuid();
const imagePath = z.string().min(1).max(500).nullable();
const optionSchema = z.object({
  id: uuid,
  option_text: z.string().max(1000),
  image_url: imagePath,
  is_correct: z.boolean(),
  coordinates_x: z.number().min(0).max(100).nullable(),
  coordinates_y: z.number().min(0).max(100).nullable(),
  correct_order: z.number().int().min(1).max(4).nullable(),
}).strict();

export const examQuestionSchema = z.object({
  id: uuid,
  question_text: z.string().trim().min(1).max(5000),
  image_url: imagePath,
  question_type: z.enum(EXAM_QUESTION_TYPES),
  correct_number: z.number().finite().min(-1_000_000_000).max(1_000_000_000).nullable(),
  explanation: z.string().max(5000),
  options: z.array(optionSchema).max(4),
}).strict().superRefine((question, context) => {
  const error = (message: string) => context.addIssue({ code: "custom", message });
  if (new Set(question.options.map((option) => option.id)).size !== question.options.length) {
    error("Antwoordopties moeten unieke ID's hebben.");
  }
  if (question.question_type === "number") {
    if (question.correct_number === null || question.options.length !== 0) error("Een getalvraag heeft één numeriek antwoord en geen opties.");
    return;
  }
  if (question.correct_number !== null) error("Alleen een getalvraag mag een numeriek antwoord hebben.");
  if (question.question_type === "multiple_choice" || question.question_type === "yes_no" || question.question_type === "multiple_response") {
    const correctCount = question.options.filter((option) => option.is_correct).length;
    if (question.options.length < 2 || (question.question_type === "yes_no" && question.options.length !== 2)
      || (question.question_type === "multiple_response" ? correctCount < 1 : correctCount !== 1)) {
      error(question.question_type === "multiple_response" ? "Kies minimaal één correct antwoord." : "Kies twee tot vier opties en precies één correct antwoord.");
    }
    if (question.options.some((option) => (!option.option_text.trim() && !option.image_url) || option.coordinates_x !== null || option.coordinates_y !== null || option.correct_order !== null)) {
      error("Elke keuze heeft tekst of een afbeelding nodig en mag geen volgorde of positie bevatten.");
    }
    return;
  }
  if (question.question_type === "single_drag" || question.question_type === "hotspot") {
    if (!question.image_url || question.options.length < 2 || question.options.filter((option) => option.is_correct).length !== 1
      || question.options.some((option) => option.coordinates_x === null || option.coordinates_y === null || option.image_url !== null || option.correct_order !== null)) {
      error("Plaats minimaal twee posities op de afbeelding en kies precies één juiste positie.");
    }
    return;
  }
  if (!question.image_url || question.options.length < 3 || question.options.length > 4) {
    error("Een volgordevraag heeft een afbeelding en drie of vier posities nodig.");
  }
  const orders = question.options.map((option) => option.correct_order).sort((a, b) => (a ?? 0) - (b ?? 0));
  if (question.options.some((option) => option.coordinates_x === null || option.coordinates_y === null || option.is_correct || option.image_url !== null)
    || orders.some((order, index) => order !== index + 1)) {
    error("Elke positie moet coördinaten en een unieke volgorde vanaf 1 hebben.");
  }
});

const examBaseSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000),
  time_limit_minutes: z.literal(EXAM_TIME_LIMIT_MINUTES),
  passing_score: z.literal(EXAM_PASSING_SCORE),
  allowed_packages: z.array(z.enum(["start", "boost", "max"])).min(1).max(3),
  is_published: z.boolean(),
  questions: z.array(examQuestionSchema),
}).strict();

function validateExamDefinition(exam: z.infer<typeof examBaseSchema>, context: z.RefinementCtx) {
  if (new Set(exam.allowed_packages).size !== exam.allowed_packages.length) {
    context.addIssue({ code: "custom", message: "Een pakket kan maar één keer worden gekozen." });
  }
  const ids = exam.questions.flatMap((question) => [question.id, ...question.options.map((option) => option.id)]);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Vragen en opties moeten unieke ID's hebben." });
  }
  if (exam.is_published && exam.questions.length === 0) {
    context.addIssue({ code: "custom", message: "Een examen heeft minimaal één vraag nodig om te publiceren." });
  }
  for (const question of exam.questions) {
    for (const path of [question.image_url, ...question.options.map((option) => option.image_url)]) {
      if (path && (!path.startsWith(`${exam.id}/`) || path.split("/").some((part) => part === "." || part === ".." || !part))) {
        context.addIssue({ code: "custom", message: "Afbeeldingen moeten bij dit examen horen." });
      }
    }
  }
}

export const examSchema = examBaseSchema
  .extend({ questions: z.array(examQuestionSchema).max(EXAM_MAX_QUESTIONS) })
  .superRefine(validateExamDefinition);
export const adminExamLoadSchema = examBaseSchema.superRefine(validateExamDefinition);

export type ExamDefinition = z.infer<typeof examSchema>;
export type ExamQuestion = z.infer<typeof examQuestionSchema>;
export type ExamAnswer = string | string[] | Record<string, number>;

export function studentQuestion(question: ExamQuestion) {
  const options = question.question_type === "ordering"
    ? [...question.options].sort((a, b) => a.id.localeCompare(b.id))
    : question.options;
  return {
    id: question.id,
    question_text: question.question_text,
    image_url: question.image_url,
    question_type: question.question_type,
    options: options.map(({ id, option_text, image_url, coordinates_x, coordinates_y }) => ({
      id, option_text, image_url, coordinates_x, coordinates_y,
    })),
  };
}

export function validateAttemptProgress(
  questions: ExamQuestion[],
  answers: unknown,
  markedQuestions: unknown,
) {
  const answerMap = z.record(z.string().uuid(), z.unknown()).safeParse(answers);
  const marks = z.array(uuid).max(questions.length).safeParse(markedQuestions);
  if (!answerMap.success || !marks.success) return false;

  const byId = new Map(questions.map((question) => [question.id, question]));
  if (new Set(marks.data).size !== marks.data.length || marks.data.some((id) => !byId.has(id))) return false;

  return Object.entries(answerMap.data).every(([id, answer]) => {
    const question = byId.get(id);
    if (!question) return false;
    if (["multiple_choice", "yes_no", "single_drag", "hotspot"].includes(question.question_type)) {
      return typeof answer === "string" && question.options.some((option) => option.id === answer);
    }
    if (question.question_type === "multiple_response") {
      return Array.isArray(answer) && answer.length <= question.options.length
        && new Set(answer).size === answer.length
        && answer.every((id) => typeof id === "string" && question.options.some((option) => option.id === id));
    }
    if (question.question_type === "number") {
      return typeof answer === "string" && answer.length <= 64 && /^-?\d*(?:[.,]\d*)?$/.test(answer);
    }
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return false;
    const entries = Object.entries(answer);
    const optionIds = new Set(question.options.map((option) => option.id));
    const values = entries.map(([, value]) => value);
    return entries.length <= question.options.length
      && entries.every(([optionId, value]) => optionIds.has(optionId)
        && typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= question.options.length)
      && new Set(values).size === values.length;
  });
}

export function isCorrectAnswer(question: ExamQuestion, answer: unknown): boolean {
  if (["multiple_choice", "yes_no", "single_drag", "hotspot"].includes(question.question_type)) {
    return typeof answer === "string" && question.options.some((option) => option.id === answer && option.is_correct);
  }
  if (question.question_type === "multiple_response") {
    if (!Array.isArray(answer) || new Set(answer).size !== answer.length) return false;
    const correct = question.options.filter((option) => option.is_correct);
    return correct.length > 0 && answer.length === correct.length && correct.every((option) => answer.includes(option.id));
  }
  if (question.question_type === "number") {
    if (typeof answer !== "string" || !/^-?\d+(?:[.,]\d+)?$/.test(answer.trim())) return false;
    const number = Number(answer.trim().replace(",", "."));
    return Number.isFinite(number) && number === question.correct_number;
  }
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return false;
  const entries = Object.entries(answer);
  return entries.length === question.options.length
    && question.options.every((option) => Object.hasOwn(answer, option.id)
      && entries.some(([id, value]) => id === option.id && value === option.correct_order));
}

export function gradeExam(questions: ExamQuestion[], answers: Record<string, unknown>) {
  const results = questions.map((question) => ({
    question_id: question.id,
    question_text: question.question_text,
    correct: isCorrectAnswer(question, answers[question.id]),
    explanation: question.explanation,
  }));
  const score = results.filter((result) => result.correct).length;
  return {
    score,
    total: results.length,
    passingScore: passingScoreForQuestionCount(results.length),
    passed: results.length > 0 && score >= passingScoreForQuestionCount(results.length),
    results,
  };
}
