/*
  Warnings:

  - A unique constraint covering the columns `[document_file_key]` on the table `document` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "document_document_file_key_key" ON "document"("document_file_key");
