/*
  Warnings:

  - Made the column `projeto_terapeutico_singular_id` on table `activity` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "activity" DROP CONSTRAINT "activity_projeto_terapeutico_singular_id_fkey";

-- AlterTable
ALTER TABLE "activity" ALTER COLUMN "projeto_terapeutico_singular_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_projeto_terapeutico_singular_id_fkey" FOREIGN KEY ("projeto_terapeutico_singular_id") REFERENCES "projeto_terapeutico_singular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
