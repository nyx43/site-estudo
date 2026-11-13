import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDatabase } from "../../src/lib/db/client";
import { seedCatalog } from "../../src/lib/db/seed-catalog";
import { seedStudy } from "../../src/lib/db/seed-study";
import { createSqliteStudyRepository } from "../../src/lib/db/study-repository";
import { createStudyService } from "../../src/lib/study/service";
import { loadCurriculum } from "../../src/lib/content/load-curriculum";
import { loadStudy } from "../../src/lib/content/load-study";
import { attempts, submissions, lessonProgress } from "../../src/lib/db/schema";
import { lessonSteps } from "../../src/lib/study/schema";
import { createStudyHandlers } from "../../src/lib/http/study-handlers";

const [seed] = await loadStudy();
const quiz = seed.exercises[0];
let directory: string;
let url: string;
let connection: ReturnType<typeof createDatabase>;
let now: Date;
const service = () => createStudyService(createSqliteStudyRepository(connection.db), () => now);

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "estudo-study-"));
  url = `file:${path.join(directory, "study.db")}`;
  connection = createDatabase(url);
  await migrate(connection.db, { migrationsFolder: "./db/migrations" });
  await seedCatalog(connection.db, await loadCurriculum());
  await seedStudy(connection.db, [seed]);
});
beforeEach(async () => {
  await connection.db.delete(submissions);
  await connection.db.delete(attempts);
  await connection.db.delete(lessonProgress);
  now = new Date("2026-11-13T18:00:00.000Z");
});
afterAll(async () => { connection.client.close(); await rm(directory, { recursive: true, force: true }); });

async function completeLesson() {
  const study = service();
  for (const question of [...seed.lesson.prequestions, ...seed.lesson.selfExplain, ...seed.lesson.retrieval]) await study.progress(seed.lesson.id, { action: "ANSWER", questionId: question.id, answer: "Minha explicação inicial." });
  for (const step of lessonSteps) await study.progress(seed.lesson.id, { action: "COMPLETE_STEP", step });
}

describe("estudo persistido", () => {
  it("não entrega respostas-modelo, gabaritos ou notas privadas no primeiro acesso", async () => {
    const view = await service().lesson(seed.lesson.topicId);
    expect(view?.exercises).toHaveLength(12);
    expect(view?.progress.completedAt).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/modelAnswer|solution|misconceptionTag|tutorNotes/);
    const exercise = await service().exercise(quiz.id);
    expect(JSON.stringify(exercise)).not.toMatch(/solution|explanation|feedback|distractor|misconceptionTag/);
    expect(exercise?.attempt).toBeNull();
  });

  it("exige respostas e sequência da aula antes de iniciar a prática", async () => {
    await expect(service().start(quiz.id)).rejects.toMatchObject({ status: 409 });
    await expect(service().progress(seed.lesson.id, { action: "COMPLETE_STEP", step: "prequestions" })).rejects.toMatchObject({ status: 409 });
    await expect(service().progress(seed.lesson.id, { action: "COMPLETE_STEP", step: "summary" })).rejects.toMatchObject({ status: 409 });
    await expect(service().progress(seed.lesson.id, { action: "ANSWER", questionId: "ausente", answer: "Teste" })).rejects.toMatchObject({ status: 400 });
    await expect(service().progress(seed.lesson.id, { action: "ANSWER", questionId: seed.lesson.prequestions[0].id, answer: " " })).rejects.toMatchObject({ status: 400 });
  });

  it("retoma respostas e partes concluídas depois de reabrir o banco", async () => {
    for (const question of seed.lesson.prequestions) await service().progress(seed.lesson.id, { action: "ANSWER", questionId: question.id, answer: "Palpite salvo." });
    await service().progress(seed.lesson.id, { action: "COMPLETE_STEP", step: "prequestions" });
    connection.client.close(); connection = createDatabase(url);
    const restored = await service().lesson(seed.lesson.topicId);
    expect(restored?.progress.completedSteps).toEqual(["prequestions"]);
    expect(restored?.progress.answers[seed.lesson.prequestions[0].id]).toBe("Palpite salvo.");
    expect(restored?.lesson.prequestions[0].modelAnswer).toBeUndefined();
  });

  it("conclui a aula uma vez e libera modelos somente após a resposta", async () => {
    await completeLesson();
    const view = await service().lesson(seed.lesson.topicId);
    expect(view?.progress.completedAt).toBe(now.toISOString());
    expect(view?.progress.completedSteps).toHaveLength(10);
    expect(view?.lesson.prequestions[0].modelAnswer).toBe(seed.lesson.prequestions[0].modelAnswer);
    now = new Date("2026-11-14T18:00:00.000Z");
    const repeated = await service().progress(seed.lesson.id, { action: "COMPLETE_STEP", step: "reflection" });
    expect(repeated.progress.completedSteps).toHaveLength(10);
    expect(repeated.progress.completedAt).toBe(view?.progress.completedAt);
  });

  it("registra múltiplos envios na mesma sessão e fecha apenas no acerto", async () => {
    await completeLesson();
    const attempt = await service().start(quiz.id);
    expect((await service().start(quiz.id)).id).toBe(attempt.id);
    const wrong = await service().submit(attempt.id, randomUUID(), { type: "MISCONCEPTION_QUIZ", optionId: "a" });
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.closedAt).toBeNull();
    expect(wrong.solutionText).toBeUndefined();
    now = new Date("2026-11-13T18:00:30.000Z");
    const right = await service().submit(attempt.id, randomUUID(), { type: "MISCONCEPTION_QUIZ", optionId: "b" });
    expect(right.isCorrect).toBe(true);
    expect(right.attemptsCount).toBe(2);
    expect(right.solvedWithoutHelp).toBe(false);
    expect(right.timeSpentSeconds).toBe(30);
    expect(right.solutionText).toBeDefined();
    expect((await service().exercise(quiz.id))?.attempt?.lastAnswer).toEqual({ type: "MISCONCEPTION_QUIZ", optionId: "b" });
  });

  it("não duplica um envio repetido e rejeita reutilização com outra resposta", async () => {
    await completeLesson();
    const attempt = await service().start(quiz.id);
    const requestId = randomUUID();
    const answer = { type: "MISCONCEPTION_QUIZ" as const, optionId: "b" };
    const first = await service().submit(attempt.id, requestId, answer);
    const replay = await service().submit(attempt.id, requestId, answer);
    expect(first.attemptsCount).toBe(1);
    expect(replay.attemptsCount).toBe(1);
    expect(replay.solvedWithoutHelp).toBe(true);
    await expect(service().submit(attempt.id, requestId, { type: "MISCONCEPTION_QUIZ", optionId: "a" })).rejects.toMatchObject({ status: 409 });
    await expect(service().submit(attempt.id, randomUUID(), answer)).rejects.toMatchObject({ status: 409 });
  });
  it("serializa aberturas e reenvios simultâneos sem duplicação", async () => {
    await completeLesson();
    const [first, second] = await Promise.all([service().start(quiz.id), service().start(quiz.id)]);
    expect(first.id).toBe(second.id);
    const requestId = randomUUID();
    const answer = { type: "MISCONCEPTION_QUIZ" as const, optionId: "b" };
    const results = await Promise.all([service().submit(first.id, requestId, answer), service().submit(first.id, requestId, answer)]);
    expect(results.map((result) => result.attemptsCount)).toEqual([1, 1]);
  });

  it("consultar a solução encerra a tentativa sem registrar um acerto", async () => {
    await completeLesson();
    const attempt = await service().start(quiz.id);
    const result = await service().giveUp(attempt.id);
    expect(result.gaveUp).toBe(true);
    expect(result.isCorrect).toBe(false);
    expect(result.solvedWithoutHelp).toBe(false);
    expect(result.attemptsCount).toBe(0);
    expect(result.solutionText).toBeDefined();
    expect((await service().giveUp(attempt.id)).closedAt).toBe(result.closedAt);
    await expect(service().submit(attempt.id, randomUUID(), { type: "MISCONCEPTION_QUIZ", optionId: "b" })).rejects.toMatchObject({ status: 409 });
  });

  it("preserva o exercício resolvido mesmo ao iniciar outra prática", async () => {
    await completeLesson();
    const attempt = await service().start(quiz.id);
    await service().submit(attempt.id, randomUUID(), { type: "MISCONCEPTION_QUIZ", optionId: "b" });
    const next = await service().start(quiz.id);
    expect(next.id).not.toBe(attempt.id);
    expect((await service().exercise(quiz.id))?.attempt?.id).toBe(next.id);
    expect((await service().lesson(seed.lesson.topicId))?.exercises[0].isCorrect).toBe(true);
  });

  it("preserva histórico ao repetir o seed e impede alteração de conteúdo em uso", async () => {
    await completeLesson();
    const attempt = await service().start(quiz.id);
    await service().submit(attempt.id, randomUUID(), { type: "MISCONCEPTION_QUIZ", optionId: "a" });
    await seedStudy(connection.db, [seed]);
    expect((await service().exercise(quiz.id))?.attempt?.attemptsCount).toBe(1);
    const changedLesson = structuredClone(seed); changedLesson.lesson.title = "Outro conteúdo";
    await expect(seedStudy(connection.db, [changedLesson])).rejects.toThrow("Aula em uso");
    const changedExercise = structuredClone(seed); changedExercise.exercises[0].explanation = "Outra correção";
    await expect(seedStudy(connection.db, [changedExercise])).rejects.toThrow("Exercício em uso");
    expect((await service().exercise(quiz.id))?.attempt?.attemptsCount).toBe(1);
  });
});

describe("HTTP de estudo", () => {
  const request = (body: string, headers: Record<string, string> = { "content-type": "application/json" }) => new Request("http://localhost/api/attempts", { method: "POST", headers, body });
  it("distingue erros de entrada, origem, tamanho e recurso ausente", async () => {
    const handlers = createStudyHandlers(service());
    expect((await handlers.start(request("{"))).status).toBe(400);
    expect((await handlers.start(request("{}", { "content-type": "text/plain" }))).status).toBe(415);
    expect((await handlers.start(request("{}", { "content-type": "application/json", origin: "https://outro.example" }))).status).toBe(403);
    expect((await handlers.start(request('"' + "x".repeat(17000) + '"'))).status).toBe(413);
    expect((await handlers.lesson("ausente.topico")).status).toBe(404);
    expect((await handlers.exercise("ausente.exercicio")).status).toBe(404);
    expect((await handlers.submit(request(JSON.stringify({ requestId: randomUUID(), answer: { type: "MISCONCEPTION_QUIZ", optionId: "b", isCorrect: true } })), "ausente")).status).toBe(400);
    expect((await handlers.progress(request(JSON.stringify({ action: "ANSWER", questionId: seed.lesson.prequestions[0].id, answer: "" })), seed.lesson.id)).status).toBe(400);
  });
  it("retorna conteúdo de estudo sem cache público", async () => {
    const response = await createStudyHandlers(service()).lesson(seed.lesson.topicId);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).data.lesson.id).toBe(seed.lesson.id);
  });
  it("aceita o Host solicitado mesmo quando o servidor usa outro hostname interno", async () => {
    const response = await createStudyHandlers(service()).progress(new Request("http://localhost:3100/api/lessons/x/progress", {
      method: "POST", headers: { "content-type": "application/json", origin: "http://127.0.0.1:3100", host: "127.0.0.1:3100" },
      body: JSON.stringify({ action: "ANSWER", questionId: seed.lesson.prequestions[0].id, answer: "Palpite válido" }),
    }), seed.lesson.id);
    expect(response.status).toBe(200);
  });
});
