import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { SubjectDefinition, TopicPlan } from "../catalog/schema";

export const subjects = sqliteTable("Subject", {
  id: text().primaryKey(), slug: text().notNull().unique(), name: text().notNull(),
  description: text().notNull(), category: text().notNull(), accent: text().notNull(),
  orderIndex: integer().notNull(), version: integer().notNull(),
  learningOutcomes: text({ mode: "json" }).$type<string[]>().notNull(),
});

export const modules = sqliteTable("Module", {
  id: text().primaryKey(), slug: text().notNull(), title: text().notNull(), description: text().notNull(),
  orderIndex: integer().notNull(),
  project: text({ mode: "json" }).$type<SubjectDefinition["modules"][number]["project"]>().notNull(),
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
