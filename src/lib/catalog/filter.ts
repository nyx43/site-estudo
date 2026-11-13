import type { CatalogSubject, SubjectCategory } from "./types";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function filterSubjects(subjects: CatalogSubject[], query: string, category: SubjectCategory | "ALL") {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return subjects.filter((subject) => {
    if (category !== "ALL" && subject.category !== category) return false;
    const haystack = normalize([
      subject.name, subject.description,
      ...subject.modules.flatMap((module) => [module.title, ...module.topics.map((topic) => `${topic.title} ${topic.summary}`)]),
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}
