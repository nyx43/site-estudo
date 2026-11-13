import type { Lesson, Exercise, Answer } from "./schema";
import type { LessonProgress } from "./progress";

export interface Submission {
  requestId: string; attemptId: string; answer: Answer; isCorrect: boolean; feedback: string; createdAt: string;
}
export interface Attempt {
  id: string; exerciseId: string; createdAt: string; closedAt: string | null; isCorrect: boolean; gaveUp: boolean;
  submissions: Submission[];
}
export interface StudyOperations {
  listLessons(): Promise<Lesson[]>;
  findLessonByTopic(topicId: string): Promise<Lesson | null>;
  findLesson(id: string): Promise<Lesson | null>;
  listExercises(lessonId: string): Promise<Exercise[]>;
  findExercise(id: string): Promise<Exercise | null>;
  getProgress(lessonId: string): Promise<LessonProgress>;
  saveProgress(lessonId: string, progress: LessonProgress): Promise<void>;
  findAttempt(id: string): Promise<Attempt | null>;
  latestAttempt(exerciseId: string): Promise<Attempt | null>;
  hasSolved(exerciseId: string): Promise<boolean>;
  createAttempt(attempt: Attempt): Promise<void>;
  saveAttempt(attempt: Attempt): Promise<void>;
  findSubmission(requestId: string): Promise<Submission | null>;
  createSubmission(submission: Submission): Promise<void>;
}
export interface StudyRepository extends StudyOperations {
  transaction<T>(work: (operations: StudyOperations) => Promise<T>): Promise<T>;
}
