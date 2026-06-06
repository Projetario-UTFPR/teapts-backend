import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { Document } from "@/modules/patient/aggregates/document.aggregate";
import { DocumentsRepository } from "@/modules/patient/repositories/documents.repository";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

export class InMemoryDocumentsRepository implements DocumentsRepository {
  public items: Document[] = [];

  public async createDocument(document: Document): Promise<Either<IrrecoverableError, Document>> {
    this.items.push(document);
    return either.right(document);
  }
}
