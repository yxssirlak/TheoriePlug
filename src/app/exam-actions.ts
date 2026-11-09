"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { adminExamLoadSchema, examSchema, EXAM_MAX_QUESTIONS } from "../lib/exam-simulator";

async function session(admin = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is niet ingesteld.");
  const store = await cookies();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Log opnieuw in om verder te gaan.");
  if (admin) {
    const { data, error: adminError } = await client.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (adminError) {
      console.error("Beheerderscontrole examens mislukt:", adminError.message);
      throw new Error("Beheerderscontrole mislukt.");
    }
    if (!data) throw new Error("Geen beheerderstoegang.");
  }
  return client;
}

function failure(error: { message: string }, context: string): never {
  console.error(context, error.message);
  throw new Error(`${context} Controleer je verbinding en probeer opnieuw.`);
}

export async function listAdminExams() {
  const client = await session(true);
  const { data, error } = await client.from("exams").select("id,title,is_published").order("created_at", { ascending: false });
  if (error) failure(error, "Examens laden mislukt.");
  return z.array(z.object({ id: z.string().uuid(), title: z.string(), is_published: z.boolean() })).parse(data);
}

export async function loadAdminExam(id: string) {
  z.string().uuid().parse(id);
  const client = await session(true);
  const { data, error } = await client.rpc("exam_admin_definition", { p_exam_id: id });
  if (error) failure(error, "Examen laden mislukt.");
  return adminExamLoadSchema.parse(data);
}

export async function saveAdminExam(input: unknown) {
  try {
    const client = await session(true);
    const parsed = examSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ongeldige examengegevens." };
    const { error } = await client.rpc("exam_save_definition", { p_definition: parsed.data });
    if (error) {
      console.error("Examen opslaan mislukt:", error.message);
      return { ok: false as const, error: "Examen opslaan mislukt. Controleer je verbinding en probeer opnieuw." };
    }
    return { ok: true as const };
  } catch (error) {
    console.error("Examen opslaan mislukt:", error);
    return { ok: false as const, error: "Examen opslaan mislukt. Controleer of je bent ingelogd en probeer opnieuw." };
  }
}

export async function prepareExamImage(examId: string, mime: string, size: number) {
  z.string().uuid().parse(examId);
  const maximumSize = mime === "video/mp4" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
  };
  const extension = extensions[mime];
  if (!extension || !Number.isInteger(size) || size <= 0 || size > maximumSize) {
    throw new Error("Kies een JPG, PNG, WebP of GIF van maximaal 10 MB, of een MP4 van maximaal 50 MB.");
  }
  const client = await session(true);
  const path = `${examId}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await client.storage.from("exam-images").createSignedUploadUrl(path);
  if (error) failure(error, "Upload voorbereiden mislukt.");
  return { path, token: data.token };
}

export async function listStudentExams() {
  const client = await session();
  const { data, error } = await client.rpc("exam_student_list");
  if (error) failure(error, "Examens laden mislukt.");
  return z.array(z.object({
    id: z.string().uuid(), title: z.string(), description: z.string(), time_limit_minutes: z.number(),
    passing_score: z.number(), question_count: z.number(), best_score: z.number().nullable(),
    active_attempt: z.string().uuid().nullable(),
  })).parse(data);
}

export async function attemptAction(input: {
  examId: string; action: "start" | "get" | "save" | "submit"; attemptId?: string;
  answers?: Record<string, unknown>; marks?: string[]; revision?: number;
}) {
  const schema = z.object({
    examId: z.string().uuid(), action: z.enum(["start", "get", "save", "submit"]),
    attemptId: z.string().uuid().optional(), answers: z.record(z.string(), z.unknown()).optional(),
    marks: z.array(z.string().uuid()).max(EXAM_MAX_QUESTIONS).optional(), revision: z.number().int().min(0).optional(),
  }).strict();
  const request = schema.parse(input);
  const client = await session();
  const { data, error } = await client.rpc("exam_attempt_action", {
    p_exam_id: request.examId, p_action: request.action, p_attempt_id: request.attemptId ?? null,
    p_answers: request.answers ?? null, p_marks: request.marks ?? null, p_revision: request.revision ?? null,
  });
  if (error) {
    console.error("Examenpoging mislukt:", error.message);
    throw new Error(error.message.includes("elders gewijzigd")
      ? "Deze poging is elders gewijzigd. Herlaad de pagina."
      : "Examenpoging verwerken mislukt. Controleer je toegang en verbinding.");
  }
  const option = z.object({ id: z.string().uuid(), option_text: z.string(), image_url: z.string().nullable(), coordinates_x: z.number().nullable(), coordinates_y: z.number().nullable() });
  return z.object({
    id: z.string().uuid(), exam_id: z.string().uuid(), status: z.enum(["in_progress", "completed"]),
    started_at: z.string(), deadline_at: z.string(), server_time: z.string(),
    answers: z.record(z.string(), z.unknown()), marked_questions: z.array(z.string()), revision: z.number(),
    score: z.number().nullable(), question_count: z.number(), passing_score: z.number(),
    result: z.array(z.object({ question_id: z.string(), question_text: z.string(), correct: z.boolean(), explanation: z.string() })).nullable(),
    questions: z.array(z.object({ id: z.string().uuid(), question_text: z.string(), image_url: z.string().nullable(),
      question_type: z.enum(["number", "multiple_choice", "ordering"]), options: z.array(option) })),
  }).parse(data);
}
