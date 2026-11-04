import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTree, toLesson, toSubtopic, toTopic } from "./mappers";
import type { PackageTier, TopicNode } from "./types";

export async function loadCourseTree(supabase: SupabaseClient): Promise<TopicNode[]> {
  const [topics, subtopics, lessons] = await Promise.all([
    supabase.from("topics").select("*"),
    supabase.from("subtopics").select("*"),
    supabase.from("lessons").select("*"),
  ]);
  const error = topics.error ?? subtopics.error ?? lessons.error;
  if (error) throw new Error(error.message);
  return buildTree(topics.data!.map(toTopic), subtopics.data!.map(toSubtopic), lessons.data!.map(toLesson));
}

// Het actieve (betaalde, niet verlopen) pakket met de hoogste tier telt; geen pakket = null
export async function loadPackageTier(supabase: SupabaseClient, userId: string): Promise<PackageTier | null> {
  const { data, error } = await supabase
    .from("user_access")
    .select("payment_status, expires_at, packages(name)")
    .eq("user_id", userId)
    .eq("payment_status", "paid")
    .gt("expires_at", new Date().toISOString());
  if (error) throw new Error(error.message);

  const rank: Record<PackageTier, number> = { start: 0, boost: 1, max: 2 };
  let best: PackageTier | null = null;
  for (const row of data ?? []) {
    const pkg = Array.isArray(row.packages) ? row.packages[0] : row.packages;
    const name = String(pkg?.name ?? "").toLowerCase();
    if (name !== "start" && name !== "boost" && name !== "max") continue;
    if (best === null || rank[name] > rank[best]) best = name;
  }
  return best;
}
