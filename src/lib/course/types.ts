export type PackageTier = "start" | "boost" | "max";

export const isAdaptive = (tier: PackageTier) => tier === "boost" || tier === "max";

export interface Topic {
  id: string;
  title: string;
  slug: string;
  order: number;
  icon: string | null;
  description: string | null;
}

export interface Subtopic {
  id: string;
  topicId: string;
  title: string;
  order: number;
}

export interface Lesson {
  id: string;
  subtopicId: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  duration: number; // seconden
  order: number;
  cheatSheetNotes: string | null;
  isPublished: boolean;
}

export interface LessonQuestion {
  id: string;
  lessonId: string;
  question: string;
  imageUrl: string | null;
  options: string[];
  correctOption: number;
  explanation: string | null;
  topicTag: string | null;
  order: number;
}

export interface UserProgress {
  userId: string;
  lessonId: string;
  completedAt: string;
}

export interface UserMastery {
  userId: string;
  topicId: string;
  subtopicId: string;
  attempts: number;
  correct: number;
  masteryScore: number; // 0-100
  updatedAt: string;
}

export interface SubtopicNode extends Subtopic {
  lessons: Lesson[];
}

export interface TopicNode extends Topic {
  subtopics: SubtopicNode[];
}
