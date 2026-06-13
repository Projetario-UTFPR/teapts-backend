import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { DocumentFileCannotBeActivatedError } from "@/modules/patient/errors/document-file-cannot-be-activated.error";
import type { Either } from "fp-ts/lib/Either";

type WithFileKey<T = {}> = {
  fileKey: string;
} & T;

export type UploadDocumentFileParams = {
  document: Buffer;
  fileName: string;
  fileType: string;
};

export type UploadDocumentFileResult = WithFileKey;

export type DeleteDocumentFileParams = WithFileKey;

export type ActivateDocumentFileParams = WithFileKey;

export type GetSignedUploadUrlParams = {
  fileName: string;
  fileType: string;
};

export type GetSignedUploadUrlResult = WithFileKey<{
  bucketUrl: string;
}>;

export abstract class DocumentFilesStorage {
  /**
   * Stores the descriptor of a document in some storage in a pending state.
   * It means that, unless activated, it might be deleted within some time window.
   */
  public abstract uploadPendingDocumentFile(
    params: UploadDocumentFileParams,
  ): Promise<Either<IrrecoverableError, UploadDocumentFileResult>>;

  /**
   * Erases the document identified by `fileKey` from the storage.
   */
  public abstract delete(
    params: DeleteDocumentFileParams,
  ): Promise<Either<IrrecoverableError, void>>;

  /**
   * Activates a document by its unique `fileKey`. An activate document
   * is supposed not to be deleted due to expiration, but only when explicitly
   * removed from the storage.
   */
  public abstract activateDocumentFile(
    params: ActivateDocumentFileParams,
  ): Promise<Either<IrrecoverableError | DocumentFileCannotBeActivatedError, void>>;

  /**
   * Signs a temporary URL for uploading a file to the underling BLOB storage.
   * This URL might be used by the client to upload the actual document directly,
   * without the need of passing through the backend.
   *
   * This is specially useful to preload the document file in the storage before
   * registering it in the system's datastore, and also it decreases the waiting
   * time and the service's memory usage (since the file won't be buffered in the
   * backend before being sent to the storage).
   */
  public abstract getSignedUploadUrl(
    params: GetSignedUploadUrlParams,
  ): Promise<Either<IrrecoverableError, GetSignedUploadUrlResult>>;
}
