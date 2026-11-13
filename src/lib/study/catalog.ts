export function orderLessons<T extends { topicId: string }>(lessons: T[], topicOrder: string[]): T[] {
  const positions = new Map(topicOrder.map((id, index) => [id, index]));
  return [...lessons].sort((a, b) => (positions.get(a.topicId) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.topicId) ?? Number.MAX_SAFE_INTEGER) || a.topicId.localeCompare(b.topicId));
}
