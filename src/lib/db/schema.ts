import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { SubjectDefinition, TopicPlan, ModuleGuide } from "../catalog/schema";
import type { Exercise, Lesson, Answer } from "../study/schema";
import type { LessonProgress } from "../study/progress";
import { sql } from "drizzle-orm";

export const subjects = sqliteTable("Subject", {
  id: text().primaryKey(), slug: text().notNull().unique(), name: text().notNull(),
  description: text().notNull(), category: text().notNull(), accent: text().notNull(),
  orderIndex: integer().notNull(), version: integer().notNull(),
  learningOutcomes: text({ mode: "json" }).$type<string[]>().notNull(),
  overview: text({ mode: "json" }).$type<string[]>(),
});

export const modules = sqliteTable("Module", {
  id: text().primaryKey(), slug: text().notNull(), title: text().notNull(), description: text().notNull(),
  orderIndex: integer().notNull(),
  project: text({ mode: "json" }).$type<SubjectDefinition["modules"][number]["project"]>().notNull(),
  guide: text({ mode: "json" }).$type<ModuleGuide>(),
  subjectId: text().notNull().references(() => subjects.id, { onDelete: "restrict", onUpdate: "cascade" }),
}, (table) => [uniqueIndex("Module_subjectId_slug_key").on(table.subjectId, table.slug), index("Module_subjectId_orderIndex_idx").on(table.subjectId, table.orderIndex)]);

export const topics = sqliteTable("Topic", {
  id: text().primaryKey(), slug: text().notNull(), title: text().notNull(), summary: text().notNull(),
  orderIndex: integer().notNull(),
  moduleId: text().notNull().references(() => modules.id, { onDelete: "restrict", onUpdate: "cascade" }),
  plan: text({ mode: "json" }).$type<TopicPlan>().notNull(),
}, (table) => [uniqueIndex("Topic_moduleId_slug_key").on(table.moduleId, table.slug), index("Topic_moduleId_orderIndex_idx").on(table.moduleId, table.orderIndex)]);

export const subjectRelations = relations(subjects, ({ many }) => ({ modules: many(modules) }));
export const moduleRelations = relations(modules, ({ one, many }) => ({
  subject: one(subjects, { fields: [modules.subjectId], references: [subjects.id] }), topics: many(topics),
}));
export const topicRelations = relations(topics, ({ one }) => ({ module: one(modules, { fields: [topics.moduleId], references: [modules.id] }) }));

export const lessons = sqliteTable("Lesson", {
  id: text().primaryKey(), topicId: text().notNull().references(() => topics.id, { onDelete: "restrict" }),
  version: integer().notNull(), definition: text({ mode: "json" }).$type<Lesson>().notNull(),
}, (table) => [uniqueIndex("Lesson_topic_version").on(table.topicId, table.version)]);

export const exercises = sqliteTable("Exercise", {
  id: text().primaryKey(), lessonId: text().notNull().references(() => lessons.id, { onDelete: "restrict" }),
  orderIndex: integer().notNull(), definition: text({ mode: "json" }).$type<Exercise>().notNull(),
}, (table) => [index("Exercise_lesson_order").on(table.lessonId, table.orderIndex)]);

export const lessonProgress = sqliteTable("LessonProgress", {
  lessonId: text().primaryKey().references(() => lessons.id, { onDelete: "restrict" }),
  progress: text({ mode: "json" }).$type<LessonProgress>().notNull(),
});

export const attempts = sqliteTable("Attempt", {
  id: text().primaryKey(), exerciseId: text().notNull().references(() => exercises.id, { onDelete: "restrict" }),
  createdAt: text().notNull(), closedAt: text(), isCorrect: integer({ mode: "boolean" }).notNull().default(false),
  gaveUp: integer({ mode: "boolean" }).notNull().default(false),
}, (table) => [uniqueIndex("Attempt_one_open").on(table.exerciseId).where(sql`${table.closedAt} IS NULL`), index("Attempt_exercise_created").on(table.exerciseId, table.createdAt)]);

export const submissions = sqliteTable("Submission", {
  requestId: text().primaryKey(), attemptId: text().notNull().references(() => attempts.id, { onDelete: "restrict" }),
  answer: text({ mode: "json" }).$type<Answer>().notNull(), isCorrect: integer({ mode: "boolean" }).notNull(),
  feedback: text().notNull(), createdAt: text().notNull(),
}, (table) => [index("Submission_attempt_created").on(table.attemptId, table.createdAt)]);
