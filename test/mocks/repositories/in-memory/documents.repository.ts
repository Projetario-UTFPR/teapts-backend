import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { Document } from "@/modules/patient/aggregates/document.aggregate";
import { DocumentNotFoundError } from "@/modules/patient/errors/document-not-found-error";
import { DocumentsRepository } from "@/modules/patient/repositories/documents.repository";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

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
}
