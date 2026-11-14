# Backup e verificação de restauração (SQLite)

Os dados pessoais de estudo ficam no SQLite local indicado por `DATABASE_URL` (por padrão `file:./data/estudo.db`). Por segurança, cópias de backup nunca devem ficar dentro do diretório do repositório Git.

## Regras de segurança

- **Nunca copie arquivos `.db` diretamente sem controle de transações** enquanto o servidor estiver escrevendo: utilize `VACUUM INTO` por meio do script oficial, que gera um arquivo autocontido e consistente.
- **Diretório obrigatório externo:** defina `ESTUDO_BACKUP_DIR` apontando para uma pasta fora do repositório (o script recusa qualquer caminho dentro do checkout ou link simbólico apontando para ele).
- **Nunca sobrescreva `data/estudo.db` durante um teste de restauração:** a checagem de restauração utiliza sempre um arquivo temporário descartável em `os.tmpdir()`.

## Gerar backup consistente

```bash
ESTUDO_BACKUP_DIR="/var/backups/estudo-es" npm run db:backup
```

O comando:

1. Valida que `ESTUDO_BACKUP_DIR` resolve para fora do repositório.
2. Executa `VACUUM INTO` criando `estudo-backup-<timestamp>.db` com permissão restrita (`0600`).
3. Executa `PRAGMA integrity_check` e `PRAGMA foreign_key_check` na cópia.
4. Compara a contagem exata de linhas das tabelas principais (`Subject`, `Module`, `Topic`, `Lesson`, `Exercise`, `LessonProgress`, `Attempt`, `Submission`) entre o banco original e o backup.

## Verificar restauração sem tocar no banco original

Para testar a restauração do backup mais recente em `ESTUDO_BACKUP_DIR`:

```bash
ESTUDO_BACKUP_DIR="/var/backups/estudo-es" npm run db:backup:verify
```

Ou indicando um arquivo específico:

```bash
npx tsx scripts/backup-db.ts --verify-restore --file "/var/backups/estudo-es/estudo-backup-20261113-220000.db"
```

O comando restaura a cópia para uma pasta temporária isolada, executa `PRAGMA integrity_check` e `PRAGMA foreign_key_check`, compara todas as contagens com o original (quando presente) e apaga a pasta temporária em seguida.

## Restauração manual (em caso de perda real)

1. Pare completamente o servidor Node/Next (`Ctrl+C`).
2. Faça uma cópia de segurança do arquivo atual corrompido (se existir) fora do repositório.
3. Verifique o backup desejado com `db:backup:verify`.
4. Substitua o destino configurado em `DATABASE_URL` pela cópia validada (removendo arquivos `-wal`/`-shm` antigos apenas com o servidor parado).
5. Confirme com `PRAGMA integrity_check` antes de iniciar novamente o site.
