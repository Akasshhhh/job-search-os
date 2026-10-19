-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "job_location" TEXT,
    "employment_country" TEXT NOT NULL DEFAULT 'India',
    "workplace_type" TEXT NOT NULL,
    "employment_type" TEXT,
    "seniority_level" TEXT,
    "sponsorship" TEXT NOT NULL DEFAULT 'unknown',
    "sponsorship_evidence" TEXT,
    "experience_requirements" JSONB NOT NULL,
    "skills" JSONB NOT NULL,
    "responsibilities" JSONB NOT NULL,
    "compensation" TEXT,
    "application_url" TEXT,
    "source_url" TEXT,
    "source_type" TEXT NOT NULL,
    "raw_description" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "provider" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");
