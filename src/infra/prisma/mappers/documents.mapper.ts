import { Document } from "@/modules/patient/aggregates/document.aggregate";
import { Prisma } from "@prisma-gen/client";

type RawDocument = Prisma.DocumentModel;

function intoPrisma(document: Document): Prisma.DocumentCreateArgs["data"] {
  const snapshot = document.toSnapshot();

  return {
    documentFileKey: snapshot.documentFileKey,
    title: snapshot.title,
    createdAt: snapshot.createdAt,
    description: snapshot.description,
    id: snapshot.id.toString(),
    lastUpdatedAt: snapshot.lastUpdatedAt,
    patientAccountId: snapshot.patientId.toString(),
  };
}

function fromPrisma(row: RawDocument) {
  return Document.createUnchecked({
    createdAt: row.createdAt,
    documentFileKey: row.documentFileKey,
    id: row.id,
    patientId: row.patientAccountId,
    title: row.title,
    description: row.description ?? undefined,
    lastUpdatedAt: row.lastUpdatedAt ? new Date(row.lastUpdatedAt) : undefined,
  });
}

export default { intoPrisma, fromPrisma };
