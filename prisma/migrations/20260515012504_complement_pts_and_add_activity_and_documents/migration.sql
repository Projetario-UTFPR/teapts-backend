/*
  Warnings:

  - Added the required column `patient_id` to the `projeto_terapeutico_singular` table without a default value. This is not possible if the table is not empty.
  - Added the required column `socialSituation` to the `projeto_terapeutico_singular` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `projeto_terapeutico_singular` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "pts_state_e" AS ENUM ('draft', 'planning', 'running', 'concluded', 'cancelled', 'rejected');

-- CreateEnum
CREATE TYPE "activity_state_e" AS ENUM ('suggested', 'rejected', 'running', 'archived');

-- AlterTable
ALTER TABLE "projeto_terapeutico_singular" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "beganAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "concludedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "patient_id" TEXT NOT NULL,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "socialSituation" TEXT NOT NULL,
ADD COLUMN     "status" "pts_state_e" NOT NULL;

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" VARCHAR(4096),
    "document_url" VARCHAR(16384) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated_at" TIMESTAMP(3),
    "patient_account_id" TEXT NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_referring_to_document_rel" (
    "activity_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,

    CONSTRAINT "activity_referring_to_document_rel_pkey" PRIMARY KEY ("activity_id","document_id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "frequency" JSONB NOT NULL,
    "state" "activity_state_e" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "assignee_professional_id" TEXT NOT NULL,
    "projeto_terapeutico_singular_id" TEXT,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "projeto_terapeutico_singular" ADD CONSTRAINT "projeto_terapeutico_singular_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_patient_account_id_fkey" FOREIGN KEY ("patient_account_id") REFERENCES "patient"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_referring_to_document_rel" ADD CONSTRAINT "activity_referring_to_document_rel_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_referring_to_document_rel" ADD CONSTRAINT "activity_referring_to_document_rel_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_assignee_professional_id_fkey" FOREIGN KEY ("assignee_professional_id") REFERENCES "professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_projeto_terapeutico_singular_id_fkey" FOREIGN KEY ("projeto_terapeutico_singular_id") REFERENCES "projeto_terapeutico_singular"("id") ON DELETE SET NULL ON UPDATE CASCADE;
