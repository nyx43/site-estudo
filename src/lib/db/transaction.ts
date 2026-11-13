import type { Database } from "./client";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
const globalForQueues = globalThis as unknown as { studyWriteQueues?: WeakMap<object, Promise<void>> };
const queues = globalForQueues.studyWriteQueues ??= new WeakMap<object, Promise<void>>();

/** One SQLite writer per connection. A failed operation never poisons the queue. */
export function writeTransaction<T>(db: Database, work: (transaction: Transaction) => Promise<T>): Promise<T> {
  const previous = queues.get(db) ?? Promise.resolve();
  const result = previous.then(() => db.transaction(work));
  queues.set(db, result.then(() => {}, () => {}));
  return result;
}
