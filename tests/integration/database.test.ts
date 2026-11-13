import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadCurriculum } from "../../src/lib/content/load-curriculum";
import { seedCatalog } from "../../src/lib/db/seed-catalog";
import { createSqliteCatalogRepository } from "../../src/lib/db/catalog-repository";
import { createFileCatalogRepository } from "../../src/lib/content/catalog-repository";
import { createDatabase } from "../../src/lib/db/client";
import { subjects, modules, topics } from "../../src/lib/db/schema";

const definitions = await loadCurriculum();
const moduleCount = definitions.flatMap((subject) => subject.modules).length;
const topicCount = definitions.flatMap((subject) => subject.modules.flatMap((item) => item.topics)).length;
let directory: string;
let connection: ReturnType<typeof createDatabase>;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "estudo-db-"));
  connection = createDatabase(`file:${path.join(directory, "test.db")}`);
  await migrate(connection.db, { migrationsFolder: "./db/migrations" });
  await migrate(connection.db, { migrationsFolder: "./db/migrations" });
});

afterAll(async () => {
  connection?.client.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("migração, seed e adaptador SQLite", () => {
  it("rejeita referências inexistentes no próprio banco", async () => {
    await expect(connection.db.insert(modules).values({ id: "invalid", slug: "invalid", title: "Inválido", description: "Inválido", orderIndex: 0, project: { brief: "Teste", deliverables: ["Teste"], acceptanceCriteria: ["Teste"] }, subjectId: "missing" })).rejects.toThrow();
  });
  it("migra um banco vazio e repete o seed sem duplicar registros", async () => {
    const definitions = await loadCurriculum();
    await seedCatalog(connection.db, definitions);
    await seedCatalog(connection.db, definitions);
    expect(await connection.db.select({ count: count() }).from(subjects)).toEqual([{ count: definitions.length }]);
    expect(await connection.db.select({ count: count() }).from(modules)).toEqual([{ count: moduleCount }]);
    expect(await connection.db.select({ count: count() }).from(topics)).toEqual([{ count: topicCount }]);
  });

  it("entrega o mesmo contrato nos adaptadores SQLite e arquivos, incluindo agrupamento 26.2 e estados", async () => {
    const database = createSqliteCatalogRepository(connection.db);
    const files = createFileCatalogRepository();
    const dbSubjects = await database.listSubjects();
    expect(dbSubjects).toEqual(await files.listSubjects());
    expect(dbSubjects.filter((item) => item.lifecycleStatus === "IN_PROGRESS")).toHaveLength(6);
    expect(dbSubjects.find((item) => item.slug === "sistemas-operacionais")?.academicTrack?.courseName).toBe("Sistemas Operacionais");
    expect(dbSubjects.find((item) => item.slug === "python")?.lifecycleStatus).toBe("PAUSED");
    expect(await database.findTopic("python.lacos-de-repeticao")).toEqual(await files.findTopic("python.lacos-de-repeticao"));
    expect(await database.findTopic("sistemas-operacionais.modo-usuario-e-kernel")).toEqual(
      await files.findTopic("sistemas-operacionais.modo-usuario-e-kernel"),
    );
    expect(await database.findSubject("ausente")).toBeNull();
    expect(await database.findTopic("python.ausente")).toBeNull();
  });

  it("rejeita conteúdo inválido antes de modificar o banco", async () => {
    const invalid = await loadCurriculum();
    invalid[0].modules[0].topics[0].plan.prerequisites = ["ausente.topico"];
    await expect(seedCatalog(connection.db, invalid)).rejects.toThrow("Pré-requisito inexistente");
    expect(await connection.db.select({ count: count() }).from(topics)).toEqual([{ count: topicCount }]);
  });

  it("atualiza conteúdo conhecido sem apagar disciplinas locais", async () => {
    const definitions = await loadCurriculum();
    const extra = structuredClone(definitions[0]);
    extra.slug = "disciplina-local";
    extra.name = "Disciplina local";
    extra.modules.forEach((item) => item.topics.forEach((topic) => { topic.plan.prerequisites = []; }));
    await seedCatalog(connection.db, [extra]);
    definitions[0].description = "Descrição atualizada para verificar o upsert.";
    await seedCatalog(connection.db, definitions);
    expect(await connection.db.select({ count: count() }).from(subjects)).toEqual([{ count: definitions.length + 1 }]);
    const row = await connection.db.query.subjects.findFirst({ where: eq(subjects.id, definitions[0].slug) });
    expect(row?.description).toBe(definitions[0].description);
    expect(await connection.db.query.subjects.findFirst({ where: eq(subjects.id, extra.slug) })).toBeDefined();
  });
});
