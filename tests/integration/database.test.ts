import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { loadCurriculum } from "../../src/lib/content/load-curriculum";
import { seedCatalog } from "../../src/lib/db/seed-catalog";
import { createPrismaCatalogRepository } from "../../src/lib/db/catalog-repository";
import { createFileCatalogRepository } from "../../src/lib/content/catalog-repository";

let directory: string;
let client: PrismaClient | undefined;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "estudo-db-"));
  const url = `file:${path.join(directory, "test.db")}`;
  await promisify(execFile)(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: url },
  });
  client = new PrismaClient({ datasources: { db: { url } } });
}, 60000);

afterAll(async () => {
  await client?.$disconnect();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("migração, seed e adaptador SQLite", () => {
  it("migra um banco vazio e repete o seed sem duplicar registros", async () => {
    if (!client) throw new Error("Banco de testes não inicializado.");
    const subjects = await loadCurriculum();
    await seedCatalog(client, subjects);
    await seedCatalog(client, subjects);
    expect(await client.subject.count()).toBe(5);
    expect(await client.module.count()).toBe(15);
    expect(await client.topic.count()).toBe(47);
  });

  it("entrega o mesmo contrato nos adaptadores SQLite e arquivos", async () => {
    if (!client) throw new Error("Banco de testes não inicializado.");
    const database = createPrismaCatalogRepository(client);
    const files = createFileCatalogRepository();
    expect(await database.listSubjects()).toEqual(await files.listSubjects());
    expect(await database.findTopic("python.lacos-de-repeticao")).toEqual(await files.findTopic("python.lacos-de-repeticao"));
    expect(await database.findSubject("ausente")).toBeNull();
    expect(await database.findTopic("python.ausente")).toBeNull();
  });

  it("rejeita conteúdo inválido antes de modificar o banco", async () => {
    if (!client) throw new Error("Banco de testes não inicializado.");
    const invalid = await loadCurriculum();
    invalid[0].modules[0].topics[0].plan.prerequisites = ["ausente.topico"];
    await expect(seedCatalog(client, invalid)).rejects.toThrow("Pré-requisito inexistente");
    expect(await client.topic.count()).toBe(47);
  });

  it("atualiza conteúdo conhecido sem apagar disciplinas locais", async () => {
    if (!client) throw new Error("Banco de testes não inicializado.");
    const subjects = await loadCurriculum();
    const extra = structuredClone(subjects[0]);
    extra.slug = "disciplina-local";
    extra.name = "Disciplina local";
    extra.modules.forEach((item) => item.topics.forEach((topic) => { topic.plan.prerequisites = []; }));
    await seedCatalog(client, [extra]);
    subjects[0].description = "Descrição atualizada para verificar o upsert.";
    await seedCatalog(client, subjects);
    expect(await client.subject.count()).toBe(6);
    expect((await client.subject.findUnique({ where: { id: subjects[0].slug } }))?.description).toBe(subjects[0].description);
    expect(await client.subject.findUnique({ where: { id: extra.slug } })).not.toBeNull();
  });
});
