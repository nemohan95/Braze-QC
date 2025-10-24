-- AlterTable
ALTER TABLE "public"."QcRun" ADD COLUMN     "copyDocHtml" TEXT,
ADD COLUMN     "copyDocLinks" JSONB;

-- CreateTable
CREATE TABLE "public"."LinkRule" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "silo" TEXT,
    "emailType" TEXT NOT NULL DEFAULT 'marketing',
    "kind" TEXT NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'contains',
    "hrefPattern" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkRule_pkey" PRIMARY KEY ("id")
);
