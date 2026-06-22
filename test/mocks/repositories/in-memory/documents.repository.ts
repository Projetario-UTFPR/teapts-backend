import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { Document } from "@/modules/patient/aggregates/document.aggregate";
import { DocumentNotFoundError } from "@/modules/patient/errors/document-not-found-error";
import { DocumentsRepository } from "@/modules/patient/repositories/documents.repository";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

export class InMemoryDocumentsRepository implements DocumentsRepository {
  public items: Document[] = [];

  public async createDocument(document: Document): Promise<Either<IrrecoverableError, Document>> {
    this.items.push(document);
    return e.right(document);
  }

  public async getById(
    id: UUID,
  ): Promise<Either<IrrecoverableError | DocumentNotFoundError, Document>> {
    const document = this.items.find((doc) => doc.getId() === id);

    if (!document) {
      return e.left(new DocumentNotFoundError(id));
    }
    return e.right(document);
  }

  public checkExistsAndBelongsToPatient(
    documentsIds: UUID[],
    patientId: UUID,
  ): Promise<Either<IrrecoverableError | DocumentNotFoundError, boolean>> {
    return pipe(
      te.right(
        this.items.filter((doc) =>
          documentsIds.some((id) => id.toString() === doc.getId().toString()),
        ),
      ),

      te.chainW((documents) => {
        const memoryDocumentsIds = new Set(documents.map((doc) => doc.getId().toString()));

        const invalidDocumentId = documentsIds.find(
          (documentId) => !memoryDocumentsIds.has(documentId.toString()),
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
