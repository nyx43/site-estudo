import { getDatabase } from "../db/client";
import { createSqliteStudyRepository } from "../db/study-repository";
import { createStudyService } from "./service";

export function getStudyService() { return createStudyService(createSqliteStudyRepository(getDatabase())); }
