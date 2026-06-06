/*
  Warnings:

  - You are about to drop the column `document_url` on the `document` table. All the data in the column will be lost.
  - Added the required column `document_file_key` to the `document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "document" DROP COLUMN "document_url",
ADD COLUMN     "document_file_key" VARCHAR(4096) NOT NULL;
