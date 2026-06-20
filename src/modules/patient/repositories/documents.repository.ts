import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { Document } from "@/modules/patient/aggregates/document.aggregate";
import { PatientNotFoundError } from "@/modules/patient/errors/patient-not-found-error";
// oxlint-disable-next-line no-unused-vars We need to import it so that we can link to it in the docstrings
import { type DocumentFilesStorage } from "@/modules/patient/storage/document-files.storage";
import { type Either } from "fp-ts/lib/Either";
import { DocumentNotFoundError } from "../errors/document-not-found-error";
import { UUID } from "@/common/uuid";

/**
 * This repository manages the entity `Document`, not the descriptor itself.
 * For storing the file descriptor, use {@link DocumentFilesStorage `DocumentFilesStorage`}
 * instead.
 */
export abstract class DocumentsRepository {
  public abstract createDocument(
    document: Document,
  ): Promise<Either<IrrecoverableError | PatientNotFoundError, Document>>;

  public abstract getById(
    id: UUID,
  ): Promise<Either<IrrecoverableError | DocumentNotFoundError, Document>>;
}
