-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."QcRun" (
    "id" TEXT NOT NULL,
    "brazeUrl" TEXT NOT NULL,
    "copyDocText" TEXT NOT NULL,
    "silo" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "summaryPass" BOOLEAN,
    "modelVersion" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "QcRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CheckResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pass" BOOLEAN NOT NULL,
    "details" JSONB,

    CONSTRAINT "CheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LinkCheck" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "statusCode" INTEGER,
    "ok" BOOLEAN,
    "redirected" BOOLEAN,
    "finalUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "LinkCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RiskRule" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "siloFilter" TEXT,
    "text" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RiskRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DisclaimerRule" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DisclaimerRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KeywordRule" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "requiredText" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KeywordRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdditionalRule" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "silo" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "links" JSONB,
    "notes" TEXT,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdditionalRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."CheckResult" ADD CONSTRAINT "CheckResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."QcRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LinkCheck" ADD CONSTRAINT "LinkCheck_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."QcRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

