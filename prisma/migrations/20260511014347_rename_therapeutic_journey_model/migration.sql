/*
  Warnings:

  - You are about to drop the `therapeutic_journey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "professional_participating_on_therapeutic_journey" DROP CONSTRAINT "professional_participating_on_therapeutic_journey_therapeu_fkey";

-- DropForeignKey
ALTER TABLE "therapeutic_journey" DROP CONSTRAINT "therapeutic_journey_responsible_professional_id_fkey";

-- DropTable
DROP TABLE "therapeutic_journey";

-- CreateTable
CREATE TABLE "projeto_terapeutico_singular" (
    "id" TEXT NOT NULL,
    "responsible_professional_id" TEXT NOT NULL,

    CONSTRAINT "projeto_terapeutico_singular_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "professional_participating_on_therapeutic_journey" ADD CONSTRAINT "professional_participating_on_therapeutic_journey_therapeu_fkey" FOREIGN KEY ("therapeutic_journey_id") REFERENCES "projeto_terapeutico_singular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto_terapeutico_singular" ADD CONSTRAINT "projeto_terapeutico_singular_responsible_professional_id_fkey" FOREIGN KEY ("responsible_professional_id") REFERENCES "professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
