export type OrderingAnswer = Record<string, number>;

export function remainingMinutes(seconds: number): number {
  return Math.max(0, Math.ceil(seconds / 60));
}

export function placeOrderingNumber(answer: OrderingAnswer, zoneId: string, value: number): OrderingAnswer {
  const next = Object.fromEntries(Object.entries(answer).filter(([, number]) => number !== value));
  next[zoneId] = value;
  return next;
}

export function removeOrderingNumber(answer: OrderingAnswer, value: number): OrderingAnswer {
  return Object.fromEntries(Object.entries(answer).filter(([, number]) => number !== value));
}

export function answerStatus(
  question: { question_type: "multiple_choice" | "yes_no" | "multiple_response" | "number" | "ordering" | "single_drag" | "hotspot"; options: { id: string }[] },
  answer: unknown,
): "empty" | "partial" | "answered" {
  if (question.question_type === "ordering") {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return "empty";
    const assigned = question.options.filter((option) => typeof (answer as Record<string, unknown>)[option.id] === "number").length;
    return assigned === 0 ? "empty" : assigned === question.options.length ? "answered" : "partial";
  }
  if (question.question_type === "multiple_response") return Array.isArray(answer) && answer.length > 0 ? "answered" : "empty";
  if (typeof answer !== "string" || !answer.trim()) return "empty";
  if (question.question_type === "number" && !/^-?\d+(?:[.,]\d+)?$/.test(answer.trim())) return "partial";
  return "answered";
}
