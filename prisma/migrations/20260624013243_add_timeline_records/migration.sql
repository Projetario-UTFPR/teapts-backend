-- CreateEnum
CREATE TYPE "TimelineRecordTarget" AS ENUM ('Pts', 'Activity');

-- CreateEnum
CREATE TYPE "TimelineRecordType" AS ENUM ('Created', 'Approved', 'Edited', 'Removed', 'Other');

-- CreateTable
CREATE TABLE "timeline_record" (
    "id" TEXT NOT NULL,
    "type" "TimelineRecordType" NOT NULL,
    "description" TEXT NOT NULL,
    "happened_at" TIMESTAMP(3) NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_type" "TimelineRecordTarget" NOT NULL,
    "projeto_terapeutico_singular_id" TEXT NOT NULL,
    "author_professional_id" TEXT,

    CONSTRAINT "timeline_record_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "timeline_record" ADD CONSTRAINT "timeline_record_projeto_terapeutico_singular_id_fkey" FOREIGN KEY ("projeto_terapeutico_singular_id") REFERENCES "projeto_terapeutico_singular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_record" ADD CONSTRAINT "timeline_record_author_professional_id_fkey" FOREIGN KEY ("author_professional_id") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
