import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { loadCurriculum } from "@/lib/content/load-curriculum";
import { loadStudy } from "@/lib/content/load-study";
import { createDatabase } from "@/lib/db/client";
import { attempts, exercises, lessonProgress, lessons, submissions } from "@/lib/db/schema";
import { seedCatalog } from "@/lib/db/seed-catalog";
import { seedStudy } from "@/lib/db/seed-study";
import { StudySeedSchema } from "@/lib/study/schema";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Seed v2 dos pilotos e preservação de histórico v1 em banco temporário", () => {
  it("mantém aulas v1, progresso, tentativas e envios ao aplicar v2 e repetir seed", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estudo-pilots-stage1-"));
    tempDirs.push(dir);
    const dbPath = path.join(dir, "pilots-stage1.db");
    const { db, client } = createDatabase(`file:${dbPath}`);

    try {
      await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "db/migrations") });
      await seedCatalog(db, await loadCurriculum());
      const allSeeds = await loadStudy();
      const v1Seeds = allSeeds.filter((seed) => seed.lesson.version === 1);
      await seedStudy(db, v1Seeds);

      await db.insert(lessonProgress).values({
        lessonId: "estruturas-de-dados.pilhas-e-filas.v1",
        progress: {
          completedSteps: ["prequestions", "why"],
          answers: { "pq-1": "resposta antiga v1" },
          completedAt: "2026-11-10T10:00:00.000Z",
        },
      });

      await db.insert(attempts).values({
        id: "att-v1-closed",
        exerciseId: "ed.pf.ex1",
        createdAt: "2026-11-10T10:01:00.000Z",
        closedAt: "2026-11-10T10:02:00.000Z",
        isCorrect: true,
        gaveUp: false,
      });

      await db.insert(submissions).values({
        requestId: "req-v1-1",
        attemptId: "att-v1-closed",
        answer: { type: "MISCONCEPTION_QUIZ", optionId: "b" },
        isCorrect: true,
        feedback: "Correto",
        createdAt: "2026-11-10T10:02:00.000Z",
      });

      await db.insert(attempts).values({
        id: "att-req-open",
        exerciseId: "req.fnf.ex1",
        createdAt: "2026-11-10T10:05:00.000Z",
        closedAt: null,
        isCorrect: false,
        gaveUp: false,
      });

      await seedStudy(db, allSeeds);
      await seedStudy(db, allSeeds);

      const allLessons = await db.select().from(lessons);
      const edLessons = allLessons.filter((l) => l.topicId === "estruturas-de-dados.pilhas-e-filas");
      const reqLessons = allLessons.filter((l) => l.topicId === "requisitos.funcionais-e-nao-funcionais");
      expect(edLessons.map((l) => l.version).sort()).toEqual([1, 2]);
      expect(reqLessons.map((l) => l.version).sort()).toEqual([1, 2]);

      const allExercises = await db.select().from(exercises);
      expect(allExercises.filter((e) => e.lessonId === "estruturas-de-dados.pilhas-e-filas.v1")).toHaveLength(6);
      expect(allExercises.filter((e) => e.lessonId === "estruturas-de-dados.pilhas-e-filas.v2")).toHaveLength(7);
      expect(allExercises.filter((e) => e.lessonId === "requisitos.funcionais-e-nao-funcionais.v1")).toHaveLength(6);
      expect(allExercises.filter((e) => e.lessonId === "requisitos.funcionais-e-nao-funcionais.v2")).toHaveLength(8);

      const savedProgress = await db.select().from(lessonProgress);
      expect(savedProgress).toHaveLength(1);
      expect(savedProgress[0].progress.answers).toEqual({ "pq-1": "resposta antiga v1" });

      const savedAttempts = await db.select().from(attempts);
      expect(savedAttempts.map((a) => a.id).sort()).toEqual(["att-req-open", "att-v1-closed"]);
      const savedSubs = await db.select().from(submissions);
      expect(savedSubs).toHaveLength(1);

      const integrity = await client.execute("PRAGMA integrity_check;");
      expect(Object.values(integrity.rows[0])[0]).toBe("ok");
      const fkCheck = await client.execute("PRAGMA foreign_key_check;");
      expect(fkCheck.rows).toHaveLength(0);
    } finally {
      client.close();
    }
  });

  it("aplica a migração 0005 sobre banco pré-0005 preservando tentativas existentes com defaults seguros", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estudo-pilots-migrate-0005-"));
    tempDirs.push(dir);
    const oldMigrationsDir = path.join(dir, "migrations-0004");
    const fullMigrationsDir = path.resolve(process.cwd(), "db/migrations");
    fs.cpSync(fullMigrationsDir, oldMigrationsDir, { recursive: true });
    fs.rmSync(path.join(oldMigrationsDir, "0005_pilot-hints-self-assessment.sql"), { force: true });
    const journalPath = path.join(oldMigrationsDir, "meta/_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
    journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 4);
    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));

    const dbPath = path.join(dir, "pre-0005.db");
    const { db, client } = createDatabase(`file:${dbPath}`);
    try {
      await migrate(db, { migrationsFolder: oldMigrationsDir });
      await seedCatalog(db, await loadCurriculum());
      const edV1 = StudySeedSchema.parse(
        JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "content/study/estruturas-pilhas-e-filas.v1.json"), "utf8")),
      );
      await db.insert(lessons).values({
        id: edV1.lesson.id,
        topicId: edV1.lesson.topicId,
        version: edV1.lesson.version,
        definition: edV1.lesson,
      });
      await db.insert(exercises).values(
        edV1.exercises.map((exercise, orderIndex) => ({
          id: exercise.id,
          lessonId: exercise.lessonId,
          orderIndex,
          definition: exercise,
        })),
      );

      await client.execute({
        sql: "INSERT INTO Attempt (id, exerciseId, createdAt, closedAt, isCorrect, gaveUp) VALUES (?, ?, ?, ?, ?, ?)",
        args: ["att-pre-0005", "ed.pf.ex1", "2026-11-10T10:00:00.000Z", "2026-11-10T10:05:00.000Z", 1, 0],
      });

      await migrate(db, { migrationsFolder: fullMigrationsDir });
      await seedStudy(db, await loadStudy());
      const rows = await db.select().from(attempts);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("att-pre-0005");
      expect(rows[0].revealedHintCount).toBe(0);
      expect(rows[0].selfAssessment).toBeNull();

      const integrity = await client.execute("PRAGMA integrity_check;");
      expect(Object.values(integrity.rows[0])[0]).toBe("ok");
      const fkCheck = await client.execute("PRAGMA foreign_key_check;");
      expect(fkCheck.rows).toHaveLength(0);
    } finally {
      client.close();
    }
  });
});
