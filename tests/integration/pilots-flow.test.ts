import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { loadCurriculum } from "@/lib/content/load-curriculum";
import { loadStudy } from "@/lib/content/load-study";
import { createDatabase } from "@/lib/db/client";
import { seedCatalog } from "@/lib/db/seed-catalog";
import { seedStudy } from "@/lib/db/seed-study";
import { createStudyHandlers } from "@/lib/http/study-handlers";
import { createSqliteStudyRepository } from "@/lib/db/study-repository";
import { lessonSteps } from "@/lib/study/schema";
import { createStudyService } from "@/lib/study/service";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

async function setupPilotDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estudo-pilots-stage2-"));
  tempDirs.push(dir);
  const { db, client } = createDatabase(`file:${path.join(dir, "flow.db")}`);
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "db/migrations") });
  await seedCatalog(db, await loadCurriculum());
  await seedStudy(db, await loadStudy());
  const repo = createSqliteStudyRepository(db);
  let seq = 0;
  const service = createStudyService(
    repo,
    () => new Date("2026-11-14T12:00:00.000Z"),
    () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`,
  );
  return { client, service };
}

describe("Etapa 2 — Acesso C1 pela leitura, bloqueio C2/C3, entrega aberta e retomada", () => {
  it("libera C1 sem concluir a aula guiada e mantém LessonProgress intacto", async () => {
    const { client, service } = await setupPilotDb();
    try {
      const initialLesson = await service.lesson("estruturas-de-dados.pilhas-e-filas", 2);
      expect(initialLesson?.lesson.version).toBe(2);
      const c1Item = initialLesson?.exercises.find((e) => e.id === "ed.pf.v2.c1");
      const c2Item = initialLesson?.exercises.find((e) => e.id === "ed.pf.v2.c2");
      const c3Item = initialLesson?.exercises.find((e) => e.id === "ed.pf.v2.c3");
      expect(c1Item?.accessible).toBe(true);
      expect(c2Item?.accessible).toBe(false);
      expect(c3Item?.accessible).toBe(false);

      await expect(service.start("ed.pf.v2.c2")).rejects.toMatchObject({ status: 409 });
      await expect(service.start("ed.pf.v2.c3")).rejects.toMatchObject({ status: 409 });

      const started = await service.start("ed.pf.v2.c1");
      expect(started.attemptStatus).toBe("IN_PROGRESS");

      const afterStart = await service.lesson("estruturas-de-dados.pilhas-e-filas", 2);
      expect(afterStart?.progress.completedSteps).toEqual([]);
      expect(afterStart?.progress.completedAt).toBeNull();

      // Resumption notice sees C1 attempt even with zero LessonProgress rows
      const v1View = await service.lesson("estruturas-de-dados.pilhas-e-filas", 1);
      const v2VersionEntry = v1View?.versions.find((v) => v.version === 2);
      expect(v2VersionEntry?.hasProgress).toBe(true);
      expect(v2VersionEntry?.hasAttempts).toBe(true);
    } finally {
      client.close();
    }
  });

  it("libera C2 e C3 após concluir percurso guiado da v2 sem exigir acerto em C1 e separa entrega aberta", async () => {
    const { client, service } = await setupPilotDb();
    try {
      const view = (await service.lesson("requisitos.funcionais-e-nao-funcionais", 2))!;
      for (const q of [...view.lesson.prequestions, ...view.lesson.selfExplain, ...view.lesson.retrieval]) {
        await service.progress(view.lesson.id, { action: "ANSWER", questionId: q.id, answer: "Minha explicação." });
      }
      for (const step of lessonSteps) {
        await service.progress(view.lesson.id, { action: "COMPLETE_STEP", step });
      }

      const unlocked = (await service.lesson("requisitos.funcionais-e-nao-funcionais", 2))!;
      expect(unlocked.exercises.every((e) => e.accessible)).toBe(true);

      // Even without answering C1 (req.fnf.v2.c1), C2 opens directly
      const c2Attempt = await service.start("req.fnf.v2.c2");
      expect((await service.exercise("req.fnf.v2.c2"))?.attempt?.rubric).toBeUndefined();

      const submitted = await service.submit(c2Attempt.id, "req-open-1", {
        type: "OPEN_RESPONSE",
        fields: {
          "perguntas-e-interlocutores": "Perguntar a secretaria e estudantes qual evento conclui a espera.",
          "criterio-e-hipoteses": "Medir clique até link disponível em homologação com 50 simultâneos (hipótese 3s).",
          "casos-de-teste": "Passa em 3,000s para 95/100; falha em 3,001s; sessão expirada exige login.",
        },
      });
      expect(submitted.isCorrect).toBe(false);
      expect(submitted.attemptStatus).toBe("SUBMITTED_FOR_REVIEW");
      expect(submitted.closedAt).toBeTruthy();
      expect(submitted.openSolution?.referenceSections.length).toBeGreaterThan(0);
      expect(submitted.rubric?.length).toBeGreaterThan(0);

      // Does not count as objective isCorrect in exercise list
      const afterOpen = (await service.lesson("requisitos.funcionais-e-nao-funcionais", 2))!;
      const c2Summary = afterOpen.exercises.find((e) => e.id === "req.fnf.v2.c2")!;
      expect(c2Summary.isCorrect).toBe(false);
      expect(c2Summary.status).toBe("SUBMITTED_FOR_REVIEW");

      // Giving up without submitting reveals referenceSections but NOT rubric
      const c3Attempt = await service.start("req.fnf.v2.c3");
      const givenUp = await service.giveUp(c3Attempt.id);
      expect(givenUp.attemptStatus).toBe("GAVE_UP");
      expect(givenUp.openSolution?.criticalFailureNote).toBeTruthy();
      expect(givenUp.rubric).toBeUndefined();
    } finally {
      client.close();
    }
  });
});

function localRequest(urlPath: string, method: "POST" | "PUT", body: unknown) {
  return new Request(`http://127.0.0.1:3000${urlPath}`, {
    method,
    headers: {
      origin: "http://127.0.0.1:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("Etapa 3 — Dicas progressivas e autoavaliação por rubrica", () => {
  it("revela dicas apenas em ordem sequencial, permite reler dicas reveladas e marca solvedWithoutHelp = false", async () => {
    const { client, service } = await setupPilotDb();
    const handlers = createStudyHandlers(service);
    try {
      const attempt = await service.start("ed.pf.v2.c1");
      expect(attempt.revealedHintCount).toBe(0);
      expect(attempt.revealedHints).toEqual([]);

      const skipRes = await handlers.revealHint(localRequest(`/api/attempts/${attempt.id}/hints`, "POST", { hintNumber: 3 }), attempt.id);
      expect(skipRes.status).toBe(409);

      const h1Res = await handlers.revealHint(localRequest(`/api/attempts/${attempt.id}/hints`, "POST", { hintNumber: 1 }), attempt.id);
      expect(h1Res.status).toBe(200);
      const h1Body = (await h1Res.json()).data;
      expect(h1Body.revealedHintCount).toBe(1);
      expect(h1Body.revealedHints).toHaveLength(1);

      const h1Repeat = await handlers.revealHint(localRequest(`/api/attempts/${attempt.id}/hints`, "POST", { hintNumber: 1 }), attempt.id);
      expect(h1Repeat.status).toBe(200);
      const h1RepeatBody = (await h1Repeat.json()).data;
      expect(h1RepeatBody.revealedHintCount).toBe(1);

      const h2Res = await handlers.revealHint(localRequest(`/api/attempts/${attempt.id}/hints`, "POST", { hintNumber: 2 }), attempt.id);
      expect(h2Res.status).toBe(200);
      expect((await h2Res.json()).data.revealedHintCount).toBe(2);

      const solved = await service.submit(attempt.id, "00000000-0000-4000-8000-000000000010", {
        type: "STRUCTURED_RESPONSE",
        values: {
          "op-1.inicio": 0, "op-1.fim": 1, "op-1.tamanho": 1, "op-1.removido": "nenhum",
          "op-2.inicio": 0, "op-2.fim": 2, "op-2.tamanho": 2, "op-2.removido": "nenhum",
          "op-3.inicio": 0, "op-3.fim": 3, "op-3.tamanho": 3, "op-3.removido": "nenhum",
          "op-4.inicio": 1, "op-4.fim": 3, "op-4.tamanho": 2, "op-4.removido": "a",
          "op-5.inicio": 2, "op-5.fim": 3, "op-5.tamanho": 1, "op-5.removido": "b",
          "estado-final.proximo": "c",
        },
      });
      expect(solved.isCorrect).toBe(true);
      expect(solved.solvedWithoutHelp).toBe(false);

      const rereadClosed = await handlers.revealHint(localRequest(`/api/attempts/${attempt.id}/hints`, "POST", { hintNumber: 1 }), attempt.id);
      expect(rereadClosed.status).toBe(200);

      const newAfterClose = await handlers.revealHint(localRequest(`/api/attempts/${attempt.id}/hints`, "POST", { hintNumber: 3 }), attempt.id);
      expect(newAfterClose.status).toBe(409);

      const reloaded = await service.exercise("ed.pf.v2.c1");
      expect(reloaded?.attempt?.revealedHintCount).toBe(2);
      expect(reloaded?.attempt?.revealedHints).toHaveLength(2);
    } finally {
      client.close();
    }
  });

  it("salva e atualiza autoavaliação por rubrica sem criar nota nem alterar envios e bloqueia estados inválidos", async () => {
    const { client, service } = await setupPilotDb();
    const handlers = createStudyHandlers(service);
    try {
      const view = (await service.lesson("requisitos.funcionais-e-nao-funcionais", 2))!;
      for (const q of [...view.lesson.prequestions, ...view.lesson.selfExplain, ...view.lesson.retrieval]) {
        await service.progress(view.lesson.id, { action: "ANSWER", questionId: q.id, answer: "Resposta guiada completa." });
      }
      for (const step of lessonSteps) {
        await service.progress(view.lesson.id, { action: "COMPLETE_STEP", step });
      }

      const c2Attempt = await service.start("req.fnf.v2.c2");
      const beforeSubmit = await handlers.saveSelfAssessment(
        localRequest(`/api/attempts/${c2Attempt.id}/self-assessment`, "PUT", { checkedCriterionIds: ["rub-fatos-hipoteses"] }),
        c2Attempt.id,
      );
      expect(beforeSubmit.status).toBe(409);

      await service.submit(c2Attempt.id, "00000000-0000-4000-8000-000000000020", {
        type: "OPEN_RESPONSE",
        fields: {
          "perguntas-e-interlocutores": "Confirmar com secretaria acadêmica qual evento encerra o processamento do arquivo.",
          "criterio-e-hipoteses": "Medir do clique até botão disponível para baixar, meta inicial 3s em homologação.",
          "casos-de-teste": "Passa em 3000ms (95/100); falha acima de 3000ms; sessão expirada redireciona sem vazar dados.",
        },
      });

      const invalidIdRes = await handlers.saveSelfAssessment(
        localRequest(`/api/attempts/${c2Attempt.id}/self-assessment`, "PUT", { checkedCriterionIds: ["criterio-inexistente"] }),
        c2Attempt.id,
      );
      expect(invalidIdRes.status).toBe(400);

      const firstSave = await handlers.saveSelfAssessment(
        localRequest(`/api/attempts/${c2Attempt.id}/self-assessment`, "PUT", { checkedCriterionIds: ["rub-fatos-hipoteses", "rub-criterio"] }),
        c2Attempt.id,
      );
      expect(firstSave.status).toBe(200);
      const firstBody = (await firstSave.json()).data;
      expect(firstBody.attemptStatus).toBe("SELF_ASSESSED");
      expect(firstBody.isCorrect).toBe(false);
      expect(firstBody.selfAssessment.checkedCriterionIds).toEqual(["rub-fatos-hipoteses", "rub-criterio"]);
      expect(firstBody.attemptsCount).toBe(1);

      const secondSave = await handlers.saveSelfAssessment(
        localRequest(`/api/attempts/${c2Attempt.id}/self-assessment`, "PUT", { checkedCriterionIds: ["rub-criterio"] }),
        c2Attempt.id,
      );
      expect(secondSave.status).toBe(200);
      const secondBody = (await secondSave.json()).data;
      expect(secondBody.selfAssessment.checkedCriterionIds).toEqual(["rub-criterio"]);
      expect(secondBody.attemptsCount).toBe(1);

      const reloadedC2 = await service.exercise("req.fnf.v2.c2");
      expect(reloadedC2?.attempt?.attemptStatus).toBe("SELF_ASSESSED");
      expect(reloadedC2?.attempt?.selfAssessment?.checkedCriterionIds).toEqual(["rub-criterio"]);

      // Closed open attempt via giveUp without submission must reject self-assessment
      const c3Attempt = await service.start("req.fnf.v2.c3");
      await service.giveUp(c3Attempt.id);
      const afterGiveUp = await handlers.saveSelfAssessment(
        localRequest(`/api/attempts/${c3Attempt.id}/self-assessment`, "PUT", { checkedCriterionIds: [] }),
        c3Attempt.id,
      );
      expect(afterGiveUp.status).toBe(409);

      // Objective exercise must reject self-assessment
      const objAttempt = await service.start("ed.pf.v2.c1");
      const objRes = await handlers.saveSelfAssessment(
        localRequest(`/api/attempts/${objAttempt.id}/self-assessment`, "PUT", { checkedCriterionIds: [] }),
        objAttempt.id,
      );
      expect(objRes.status).toBe(409);
    } finally {
      client.close();
    }
  });
});
