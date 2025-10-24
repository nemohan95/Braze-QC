-- AlterTable
ALTER TABLE "public"."DisclaimerRule" ADD COLUMN     "emailType" TEXT NOT NULL DEFAULT 'marketing';

-- AlterTable
ALTER TABLE "public"."QcRun" ADD COLUMN     "emailType" TEXT NOT NULL DEFAULT 'marketing';
