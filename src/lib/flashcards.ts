export type FlashcardCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  lesson_id: string | null;
};

export type Flashcard = {
  id: string;
  category_id: string;
  front: string;
  back: string;
  image_url: string | null;
  explanation: string | null;
  sort_order: number;
  is_published: boolean;
};

export type MasteryLevel = "hard" | "doubt" | "mastered";
export type FlashcardProgress = { flashcard_id: string; mastery_level: MasteryLevel };

export function updateCardSelection(selected: ReadonlySet<string>, ids: readonly string[], checked: boolean): Set<string> {
  const next = new Set(selected);
  for (const id of ids) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function cardsForCategory(cards: Flashcard[], categoryId: string | null): Flashcard[] {
  return categoryId === null ? cards : cards.filter((card) => card.category_id === categoryId);
}

export function completedCategoryIds(cards: Flashcard[], progress: Record<string, MasteryLevel>): Set<string> {
  const byCategory = new Map<string, Flashcard[]>();
  for (const card of cards) {
    const categoryCards = byCategory.get(card.category_id) ?? [];
    categoryCards.push(card);
    byCategory.set(card.category_id, categoryCards);
  }
  return new Set([...byCategory].filter(([, categoryCards]) =>
    categoryCards.every((card) => progress[card.id] === "mastered"),
  ).map(([id]) => id));
}

export function availableCards(cards: Flashcard[], completed: ReadonlySet<string>): Flashcard[] {
  return cards.filter((card) => !completed.has(card.category_id));
}

export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const result: T[] = [];
  const pageSize = 500;
  for (;;) {
    const { data, error } = await page(result.length, result.length + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data) throw new Error("De database gaf geen gegevens terug.");
    if (data.length === 0) return result;
    result.push(...data);
  }
}

export function shuffleCards<T>(items: T[], random = Math.random): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function nextQueue(queue: string[], level: MasteryLevel): string[] {
  const [current, ...remaining] = queue;
  if (!current || level === "mastered") return remaining;
  if (level === "hard") return [...remaining, current];
  const position = Math.min(remaining.length, Math.max(1, Math.ceil(remaining.length / 2)));
  remaining.splice(position, 0, current);
  return remaining;
}
