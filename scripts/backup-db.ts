import "dotenv/config";
import path from "node:path";
import { createDatabaseBackup, verifyBackupRestore } from "../src/lib/db/backup";

function parseArgs(argv: string[]) {
  const verifyRestore = argv.includes("--verify-restore");
  const fileIndex = argv.indexOf("--file");
  const backupFile = fileIndex >= 0 ? argv[fileIndex + 1] : undefined;
  return { verifyRestore, backupFile };
}

async function main() {
  const { verifyRestore, backupFile } = parseArgs(process.argv.slice(2));
  const backupDir = process.env.ESTUDO_BACKUP_DIR;

  if (verifyRestore) {
    const result = await verifyBackupRestore({
      backupFile,
      backupDir,
      databaseUrl: process.env.DATABASE_URL,
    });
    console.log(`Verificação de restauração concluída (original intacto).`);
    console.log(`Arquivo verificado: ${path.basename(result.backupFile)}`);
    console.log(`PRAGMA integrity_check: ${result.integrityCheck} | foreign_key_check erros: ${result.foreignKeyErrors}`);
    console.log(`Contagens restauradas: ${JSON.stringify(result.restoredCounts)}`);
    return;
  }

  const result = await createDatabaseBackup({
    databaseUrl: process.env.DATABASE_URL,
    backupDir,
  });
  console.log(`Backup consistente gerado com VACUUM INTO fora do repositório.`);
  console.log(`Arquivo criado: ${path.basename(result.backupFile)} (${result.sizeBytes} bytes)`);
  console.log(`PRAGMA integrity_check: ${result.integrityCheck} | foreign_key_check erros: ${result.foreignKeyErrors}`);
  console.log(`Contagens conferidas: ${JSON.stringify(result.backupCounts)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
