import { createClient } from "@libsql/client";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const BACKUP_TABLES = [
  "Subject",
  "Module",
  "Topic",
  "Lesson",
  "Exercise",
  "LessonProgress",
  "Attempt",
  "Submission",
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];
export type TableRowCounts = Record<BackupTableName, number>;

export interface DatabaseBackupResult {
  backupFile: string;
  sizeBytes: number;
  integrityCheck: string;
  foreignKeyErrors: number;
  sourceCounts: TableRowCounts;
  backupCounts: TableRowCounts;
}

export interface RestoreVerificationResult {
  backupFile: string;
  integrityCheck: string;
  foreignKeyErrors: number;
  restoredCounts: TableRowCounts;
  sourceCounts?: TableRowCounts;
}

function resolveCanonicalPath(targetPath: string): string {
  const absolute = path.resolve(targetPath);
  const tailSegments: string[] = [];
  let cursor = absolute;

  while (!existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    tailSegments.unshift(path.basename(cursor));
    cursor = parent;
  }

  const realBase = existsSync(cursor) ? realpathSync(cursor) : cursor;
  return path.join(realBase, ...tailSegments);
}

export function isPathInsideDirectory(targetPath: string, containerDir: string): boolean {
  const canonicalTarget = resolveCanonicalPath(targetPath);
  const canonicalContainer = resolveCanonicalPath(containerDir);
  const relative = path.relative(canonicalContainer, canonicalTarget);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function resolveSourceDatabasePath(databaseUrl = process.env.DATABASE_URL ?? "file:./data/estudo.db"): string {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("Apenas bancos SQLite locais (file:...) são suportados pelo backup.");
  }
  const rawPath = databaseUrl.slice(5);
  if (!rawPath) {
    throw new Error("DATABASE_URL inválido para backup.");
  }
  return path.resolve(rawPath);
}

export function assertSafeBackupDirectory(backupDir: string | undefined, repoRoot = process.cwd()): string {
  if (!backupDir || !backupDir.trim()) {
    throw new Error(
      "Defina a variável de ambiente ESTUDO_BACKUP_DIR apontando para um diretório fora do repositório.",
    );
  }
  const resolved = resolveCanonicalPath(backupDir.trim());
  if (isPathInsideDirectory(resolved, repoRoot)) {
    throw new Error(
      "Recusado: o diretório de backup não pode ficar dentro do repositório Git. Use um caminho externo.",
    );
  }
  return resolved;
}

function formatBackupTimestamp(now = new Date()): string {
  return now.toISOString().replace(/[-:]/g, "").replace("T", "-").replace(/\..+$/, "");
}

function escapeSqliteString(value: string): string {
  if (value.includes("\0")) {
    throw new Error("Caminho de arquivo inválido para SQLite.");
  }
  return `'${value.replace(/'/g, "''")}'`;
}

export async function inspectSqliteDatabase(dbFilePath: string): Promise<{
  integrityCheck: string;
  foreignKeyErrors: number;
  counts: TableRowCounts;
}> {
  const client = createClient({ url: pathToFileURL(path.resolve(dbFilePath)).href });
  try {
    const integrityResult = await client.execute("PRAGMA integrity_check");
    const integrityCheck = String(integrityResult.rows[0]?.integrity_check ?? "unknown");
    if (integrityCheck !== "ok") {
      throw new Error(`PRAGMA integrity_check falhou: ${integrityCheck}`);
    }

    const fkResult = await client.execute("PRAGMA foreign_key_check");
    const foreignKeyErrors = fkResult.rows.length;
    if (foreignKeyErrors > 0) {
      throw new Error(`PRAGMA foreign_key_check encontrou ${foreignKeyErrors} inconsistência(s).`);
    }

    const counts = {} as TableRowCounts;
    for (const table of BACKUP_TABLES) {
      const result = await client.execute(`SELECT COUNT(*) AS n FROM "${table}"`);
      counts[table] = Number(result.rows[0]?.n ?? 0);
    }

    return { integrityCheck, foreignKeyErrors, counts };
  } finally {
    client.close();
  }
}

function assertMatchingCounts(expected: TableRowCounts, actual: TableRowCounts, label: string): void {
  for (const table of BACKUP_TABLES) {
    if (expected[table] !== actual[table]) {
      throw new Error(
        `Divergência de linhas na tabela ${table} (${label}): esperado ${expected[table]}, obtido ${actual[table]}.`,
      );
    }
  }
}

/** Gera backup consistente com VACUUM INTO fora do repositório e valida integridade e contagens. */
export async function createDatabaseBackup(options: {
  databaseUrl?: string;
  backupDir: string | undefined;
  repoRoot?: string;
  now?: Date;
}): Promise<DatabaseBackupResult> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const sourcePath = resolveCanonicalPath(resolveSourceDatabasePath(options.databaseUrl));
  if (!existsSync(sourcePath)) {
    throw new Error("Banco de origem não encontrado para backup.");
  }

  const safeDir = assertSafeBackupDirectory(options.backupDir, repoRoot);
  mkdirSync(safeDir, { recursive: true, mode: 0o700 });

  const stamp = formatBackupTimestamp(options.now);
  let backupFile = path.join(safeDir, `estudo-backup-${stamp}.db`);
  if (existsSync(backupFile)) {
    backupFile = path.join(safeDir, `estudo-backup-${stamp}-${process.pid}.db`);
  }
  if (resolveCanonicalPath(backupFile) === sourcePath) {
    throw new Error("Recusado: o arquivo de backup não pode coincidir com o banco original.");
  }

  const sourceClient = createClient({ url: pathToFileURL(sourcePath).href });
  try {
    await sourceClient.execute(`VACUUM INTO ${escapeSqliteString(backupFile)}`);
  } finally {
    sourceClient.close();
  }

  chmodSync(backupFile, 0o600);

  const sourceSummary = await inspectSqliteDatabase(sourcePath);
  const backupSummary = await inspectSqliteDatabase(backupFile);
  assertMatchingCounts(sourceSummary.counts, backupSummary.counts, "original vs cópia");

  const sizeBytes = statSync(backupFile).size;
  return {
    backupFile,
    sizeBytes,
    integrityCheck: backupSummary.integrityCheck,
    foreignKeyErrors: backupSummary.foreignKeyErrors,
    sourceCounts: sourceSummary.counts,
    backupCounts: backupSummary.counts,
  };
}

export function findLatestBackupFile(backupDir: string): string {
  const entries = readdirSync(backupDir)
    .filter((name) => /^estudo-backup-.*\.db$/.test(name))
    .map((name) => {
      const fullPath = path.join(backupDir, name);
      return { fullPath, mtimeMs: statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (entries.length === 0) {
    throw new Error("Nenhum arquivo de backup (estudo-backup-*.db) encontrado no diretório informado.");
  }
  return entries[0].fullPath;
}

/** Restaura o backup em um arquivo temporário isolado para confirmar integridade sem tocar no original. */
export async function verifyBackupRestore(options: {
  backupFile?: string;
  backupDir?: string;
  databaseUrl?: string;
  repoRoot?: string;
}): Promise<RestoreVerificationResult> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const targetBackup = options.backupFile
    ? resolveCanonicalPath(options.backupFile)
    : findLatestBackupFile(assertSafeBackupDirectory(options.backupDir, repoRoot));

  if (!existsSync(targetBackup)) {
    throw new Error("Arquivo de backup informado não existe.");
  }

  const sourcePath = options.databaseUrl || process.env.DATABASE_URL
    ? resolveCanonicalPath(resolveSourceDatabasePath(options.databaseUrl))
    : null;
  if (sourcePath && targetBackup === sourcePath) {
    throw new Error("Arquivo de backup não pode apontar para o banco original.");
  }

  const backupSummary = await inspectSqliteDatabase(targetBackup);
  const tempRoot = mkdtempSync(path.join(tmpdir(), "estudo-restore-check-"));
  const tempRestored = path.join(tempRoot, "restored.db");

  try {
    if (isPathInsideDirectory(tempRestored, repoRoot) || (sourcePath && tempRestored === sourcePath)) {
      throw new Error("Arquivo temporário de restauração inválido.");
    }
    copyFileSync(targetBackup, tempRestored);
    const restoredSummary = await inspectSqliteDatabase(tempRestored);
    assertMatchingCounts(backupSummary.counts, restoredSummary.counts, "backup vs restauração temporária");

    let sourceCounts: TableRowCounts | undefined;
    if (sourcePath && existsSync(sourcePath)) {
      const sourceSummary = await inspectSqliteDatabase(sourcePath);
      assertMatchingCounts(sourceSummary.counts, restoredSummary.counts, "original vs restauração temporária");
      sourceCounts = sourceSummary.counts;
    }

    return {
      backupFile: targetBackup,
      integrityCheck: restoredSummary.integrityCheck,
      foreignKeyErrors: restoredSummary.foreignKeyErrors,
      restoredCounts: restoredSummary.counts,
      ...(sourceCounts ? { sourceCounts } : {}),
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
