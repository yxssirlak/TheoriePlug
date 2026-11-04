/** Nieuwe beheersing na een quiz: recente resultaten wegen zwaarder dan oude. */
export function nextMasteryScore(previous: number | null, correct: number, total: number): number {
  if (total <= 0) return previous ?? 0;
  const quizScore = (correct / total) * 100;
  const blended = previous === null ? quizScore : previous * 0.6 + quizScore * 0.4;
  return Math.max(0, Math.min(100, Math.round(blended)));
}

export const WEAK_THRESHOLD = 70;

export const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};
