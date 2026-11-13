import type {
  AcademicTrack,
  ModuleGuide,
  SubjectAccent,
  SubjectCategory,
  SubjectLifecycleStatus,
  TopicPlan,
} from "./schema";
export type { AcademicTrack, SubjectCategory, SubjectLifecycleStatus } from "./schema";

// Public catalog DTOs; persistence models never cross the presentation boundary.
export interface CatalogTopic {
  id: string;
  slug: string;
  title: string;
  summary: string;
  plan: TopicPlan;
}

export interface CatalogModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  guide?: ModuleGuide;
  project: { brief: string; deliverables: string[]; acceptanceCriteria: string[] };
  topics: CatalogTopic[];
}

export interface CatalogSubject {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: SubjectCategory;
  accent: SubjectAccent;
  lifecycleStatus: SubjectLifecycleStatus;
  academicTrack?: AcademicTrack;
  version: number;
  learningOutcomes: string[];
  overview?: string[];
  modules: CatalogModule[];
}

export interface CatalogRepository {
  listSubjects(): Promise<CatalogSubject[]>;
  findSubject(slug: string): Promise<CatalogSubject | null>;
  findTopic(id: string): Promise<{ subject: CatalogSubject; module: CatalogModule; topic: CatalogTopic } | null>;
}
