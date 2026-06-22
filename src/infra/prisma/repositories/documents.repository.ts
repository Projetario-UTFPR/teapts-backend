import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import documentsMapper from "@/infra/prisma/mappers/documents.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Document } from "@/modules/patient/aggregates/document.aggregate";
import { DocumentNotFoundError } from "@/modules/patient/errors/document-not-found-error";
import { PatientNotFoundError } from "@/modules/patient/errors/patient-not-found-error";
import { DocumentsRepository } from "@/modules/patient/repositories/documents.repository";
import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma-gen/internal/prismaNamespace";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaDocumentsRepository implements DocumentsRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public createDocument(document: Document) {
    return pipe(
      te.tryCatch(
        () => this.prisma.document.create({ data: documentsMapper.intoPrisma(document) }),
        (error) => {
          const isForeignKeyViolation =
            error instanceof PrismaClientKnownRequestError && error.code === "P2003";

          if (isForeignKeyViolation) {
            return new PatientNotFoundError();
          }

          return new IrrecoverableError({
            message: `Error occurred in ${PrismaDocumentsRepository.name} when creating a document.`,
            cause: error as Error,
          });
        },
      ),
      te.map(documentsMapper.fromPrisma),
    )();
  }

  public getById(id: UUID): Promise<Either<IrrecoverableError | DocumentNotFoundError, Document>> {
    return pipe(
      te.tryCatch(
        () => this.prisma.document.findUnique({ where: { id: id.toString() } }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${PrismaDocumentsRepository.name} when finding document by ID "${id.toString()}".`,
            cause: error as Error,
          }),
      ),
      te.chainW((document) => {
        if (!document) {
          return te.left(new DocumentNotFoundError(id));
        }
        return te.right(document);
      }),
      te.map(documentsMapper.fromPrisma),
    )();
  }

  public checkExistsAndBelongsToPatient(
    documentsIds: UUID[],
    patientId: UUID,
  ): Promise<Either<IrrecoverableError | DocumentNotFoundError, boolean>> {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.document.findMany({
            where: { id: { in: documentsIds.map((id) => id.toString()) } },
          }),
        (error) =>
          new IrrecoverableError({
            message: "Internal error trying to get document",
            cause: error as Error,
          }),
      ),
      te.map((prismaDocuments) =>
        prismaDocuments.map((document) => documentsMapper.fromPrisma(document)),
      ),
      te.chainW((documents) => {
        const prismaDocumentsIds = documents.map((document) => document.getId().toString());
        const documentsSet = new Set(prismaDocumentsIds);

        const invalidDocumentId = documentsIds.find(
          (documentId) => !documentsSet.has(documentId.toString()),
        );
        if (invalidDocumentId) {
          return te.left(new DocumentNotFoundError(invalidDocumentId));
        }

        const hasDocumentFromAnotherPatient = documents.some(
          (document) => !document.belongsToPatient(patientId),
        );
        if (hasDocumentFromAnotherPatient) {
          return te.right(false);
        }
        return te.right(true);
      }),
    )();
  }
}
