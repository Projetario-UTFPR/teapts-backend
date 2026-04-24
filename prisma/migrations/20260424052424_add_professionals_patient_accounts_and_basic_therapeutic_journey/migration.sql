-- CreateEnum
CREATE TYPE "specialism_e" AS ENUM ('psychologist', 'doctor', 'physiotherapist');

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "last_updated_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient" (
    "accountId" TEXT NOT NULL,
    "supportContacts" JSONB[],

    CONSTRAINT "patient_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "professional" (
    "id" TEXT NOT NULL,
    "specialism" "specialism_e" NOT NULL,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_participating_on_therapeutic_journey" (
    "professional_id" TEXT NOT NULL,
    "therapeutic_journey_id" TEXT NOT NULL,

    CONSTRAINT "professional_participating_on_therapeutic_journey_pkey" PRIMARY KEY ("professional_id","therapeutic_journey_id")
);

-- CreateTable
CREATE TABLE "therapeutic_journey" (
    "id" TEXT NOT NULL,
    "responsible_professional_id" TEXT NOT NULL,

    CONSTRAINT "therapeutic_journey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_email_key" ON "account"("email");

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional" ADD CONSTRAINT "professional_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_participating_on_therapeutic_journey" ADD CONSTRAINT "professional_participating_on_therapeutic_journey_professi_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_participating_on_therapeutic_journey" ADD CONSTRAINT "professional_participating_on_therapeutic_journey_therapeu_fkey" FOREIGN KEY ("therapeutic_journey_id") REFERENCES "therapeutic_journey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapeutic_journey" ADD CONSTRAINT "therapeutic_journey_responsible_professional_id_fkey" FOREIGN KEY ("responsible_professional_id") REFERENCES "professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
