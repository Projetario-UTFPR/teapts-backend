import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { generateUniqueFileName } from "@/common/filename";
import {
  ActivateDocumentFileParams,
  DeleteDocumentFileParams,
  DocumentFilesStorage,
  GetSignedUploadUrlParams,
  GetSignedUploadUrlResult,
  UploadDocumentFileParams,
  UploadDocumentFileResult,
} from "@/modules/patient/storage/document-files.storage";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

type RawDocument = {
  document: Buffer;
  fileName: string;
  fileType: string;
  active: boolean;
  fileKey: string;
};

export class InMemoryDocumentFilesStorage implements DocumentFilesStorage {
  public documentFiles: Map<string, RawDocument> = new Map();

  public async uploadPendingDocumentFile(
    params: UploadDocumentFileParams,
  ): Promise<Either<IrrecoverableError, UploadDocumentFileResult>> {
    const fileKey = generateUniqueFileName(params.fileName);

    this.documentFiles.set(fileKey, {
      ...params,
      active: false,
      fileKey,
    });

    return either.right({ fileKey });
  }

  public async delete({
    fileKey,
  }: DeleteDocumentFileParams): Promise<Either<IrrecoverableError, void>> {
    this.documentFiles.delete(fileKey);
    return either.right(undefined);
  }

  public async activateDocumentFile({
    fileKey,
  }: ActivateDocumentFileParams): Promise<Either<IrrecoverableError, void>> {
    const document = this.documentFiles.get(fileKey);

    if (document) document.active = true;

    return either.right(undefined);
  }

  public async getSignedUploadUrl({
    fileName,
    fileType,
  }: GetSignedUploadUrlParams): Promise<Either<IrrecoverableError, GetSignedUploadUrlResult>> {
    // some random url and mocked url...
    const fileKey = generateUniqueFileName(fileName);
    const url = `http://test-system.dev/upload${fileKey}?type=${fileType}`;
    return either.right({ bucketUrl: url, fileKey });
  }
}
