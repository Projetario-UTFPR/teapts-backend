import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import documentsMapper from "@/infra/prisma/mappers/documents.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Document } from "@/modules/patient/aggregates/document.aggregate";
import { PatientNotFoundError } from "@/modules/patient/errors/patient-not-found-error";
import { DocumentsRepository } from "@/modules/patient/repositories/documents.repository";
import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma-gen/internal/prismaNamespace";
import { taskEither as te } from "fp-ts";
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
}
