import type { Lesson, LessonQuestion, Subtopic, Topic, TopicNode, UserMastery } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const toTopic = (r: any): Topic => ({
  id: r.id,
  title: r.title,
  slug: r.slug,
  order: r.sort_order,
  icon: r.icon,
  description: r.description,
});

export const toSubtopic = (r: any): Subtopic => ({
  id: r.id,
  topicId: r.topic_id,
  title: r.title,
  order: r.sort_order,
});

export const toLesson = (r: any): Lesson => ({
  id: r.id,
  subtopicId: r.subtopic_id,
  title: r.title,
  description: r.description,
  videoUrl: r.video_url,
  duration: r.duration_seconds,
  order: r.sort_order,
  cheatSheetNotes: r.cheat_sheet_notes,
  isPublished: r.is_published,
});

export const toQuestion = (r: any): LessonQuestion => ({
  id: r.id,
  lessonId: r.lesson_id,
  question: r.question,
  imageUrl: r.image_url,
  options: r.options,
  correctOption: r.correct_option,
  explanation: r.explanation,
  topicTag: r.topic_tag,
  order: r.sort_order,
});

export const toMastery = (r: any): UserMastery => ({
  userId: r.user_id,
  topicId: r.topic_id,
  subtopicId: r.subtopic_id,
  attempts: r.attempts,
  correct: r.correct,
  masteryScore: r.mastery_score,
  updatedAt: r.updated_at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export function buildTree(topics: Topic[], subtopics: Subtopic[], lessons: Lesson[]): TopicNode[] {
  const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;
  return [...topics].sort(byOrder).map((topic) => ({
    ...topic,
    subtopics: subtopics
      .filter((s) => s.topicId === topic.id)
      .sort(byOrder)
      .map((s) => ({ ...s, lessons: lessons.filter((l) => l.subtopicId === s.id).sort(byOrder) })),
  }));
}
