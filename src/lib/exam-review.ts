import { z } from "zod";

const reviewOptionSchema = z.object({
  id: z.string().uuid(),
  option_text: z.string(),
  image_url: z.string().nullable(),
  is_correct: z.boolean(),
  coordinates_x: z.number().nullable(),
  coordinates_y: z.number().nullable(),
  correct_order: z.number().int().nullable(),
});

export const examReviewSchema = z.array(z.object({
  id: z.string().uuid(),
  question_text: z.string(),
  image_url: z.string().nullable(),
  question_type: z.enum(["multiple_choice", "yes_no", "multiple_response", "number", "ordering", "single_drag", "hotspot"]),
  correct_number: z.number().nullable(),
  explanation: z.string(),
  options: z.array(reviewOptionSchema),
}));

export type ReviewQuestion = z.infer<typeof examReviewSchema>[number];

export function reviewOrderingAnswer(answer: unknown, optionId: string): number | null {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return null;
  const value = (answer as Record<string, unknown>)[optionId];
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
