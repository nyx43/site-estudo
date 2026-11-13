import type { CatalogSubject, SubjectCategory, SubjectLifecycleStatus } from "./types";

export const SUBJECT_LIFECYCLE_LABELS: Record<SubjectLifecycleStatus, string> = {
  IN_PROGRESS: "Em desenvolvimento",
  PAUSED: "Pausada",
  UPCOMING: "Em breve",
};

export interface AcademicCourseGroup {
  period: string;
  courseName: string;
  orderIndex: number;
  subjects: CatalogSubject[];
  relatedSubjectSlugs: string[];
  scopeNotes: string[];
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function filterSubjects(
  subjects: CatalogSubject[],
  query: string,
  category: SubjectCategory | "ALL",
  lifecycleStatus: SubjectLifecycleStatus | "ALL" = "ALL",
) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return subjects.filter((subject) => {
    if (category !== "ALL" && subject.category !== category) return false;
    if (lifecycleStatus !== "ALL" && subject.lifecycleStatus !== lifecycleStatus) return false;
    const haystack = normalize([
      subject.name,
      subject.description,
      SUBJECT_LIFECYCLE_LABELS[subject.lifecycleStatus],
      subject.academicTrack?.period ?? "",
      subject.academicTrack?.courseName ?? "",
      subject.academicTrack?.scopeNote ?? "",
      ...subject.modules.flatMap((module) => [module.title, ...module.topics.map((topic) => `${topic.title} ${topic.summary}`)]),
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

export function groupSubjectsByLifecycle(subjects: CatalogSubject[]) {
  return {
    IN_PROGRESS: subjects.filter((subject) => subject.lifecycleStatus === "IN_PROGRESS"),
    PAUSED: subjects.filter((subject) => subject.lifecycleStatus === "PAUSED"),
    UPCOMING: subjects.filter((subject) => subject.lifecycleStatus === "UPCOMING"),
  };
}

export function getAcademicPeriodGroups(subjects: CatalogSubject[], period: string): AcademicCourseGroup[] {
  const map = new Map<string, AcademicCourseGroup>();
  for (const subject of subjects) {
    const track = subject.academicTrack;
    if (!track || track.period !== period) continue;
    const key = `${track.orderIndex}:${track.courseName}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        period: track.period,
        courseName: track.courseName,
        orderIndex: track.orderIndex,
        subjects: [subject],
        relatedSubjectSlugs: [...(track.relatedSubjects ?? [])],
        scopeNotes: track.scopeNote ? [track.scopeNote] : [],
      });
    } else {
      existing.subjects.push(subject);
      for (const rel of track.relatedSubjects ?? []) {
        if (!existing.relatedSubjectSlugs.includes(rel)) {
          existing.relatedSubjectSlugs.push(rel);
        }
      }
      if (track.scopeNote && !existing.scopeNotes.includes(track.scopeNote)) {
        existing.scopeNotes.push(track.scopeNote);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.orderIndex - b.orderIndex || a.courseName.localeCompare(b.courseName, "pt-BR"));
}
