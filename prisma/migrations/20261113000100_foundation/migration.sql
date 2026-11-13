CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "learningOutcomes" JSONB NOT NULL
);

CREATE TABLE "Module" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "project" JSONB NOT NULL,
    "subjectId" TEXT NOT NULL,
    CONSTRAINT "Module_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "moduleId" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    CONSTRAINT "Topic_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Subject_slug_key" ON "Subject"("slug");
CREATE UNIQUE INDEX "Module_subjectId_slug_key" ON "Module"("subjectId", "slug");
CREATE INDEX "Module_subjectId_orderIndex_idx" ON "Module"("subjectId", "orderIndex");
CREATE UNIQUE INDEX "Topic_moduleId_slug_key" ON "Topic"("moduleId", "slug");
CREATE INDEX "Topic_moduleId_orderIndex_idx" ON "Topic"("moduleId", "orderIndex");
