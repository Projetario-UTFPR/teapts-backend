// TODO: add integration tests
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { generateUniqueFileName } from "@/common/filename";
import blobStorageConfig from "@/configs/blob-storage.config";
import {
  ActivateDocumentFileParams,
  DeleteDocumentFileParams,
  DocumentFilesStorage,
  GetSignedUploadUrlParams,
  GetSignedUploadUrlResult,
  UploadDocumentFileParams,
  UploadDocumentFileResult,
} from "@/modules/patient/storage/document-files.storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DeleteObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  PutObjectTaggingCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { DocumentFileCannotBeActivatedError } from "@/modules/patient/errors/document-file-cannot-be-activated.error";

@Injectable()
export class S3DocumentFilesStorage extends DocumentFilesStorage {
  public constructor(
    private readonly s3: S3Client,
    @Inject(blobStorageConfig.KEY) private readonly storageConfig: ConfigType<
      typeof blobStorageConfig
    >,
  ) {
    super();
  }

  public async uploadPendingDocumentFile({
    document,
    fileName,
    fileType,
  }: UploadDocumentFileParams): Promise<Either<IrrecoverableError, UploadDocumentFileResult>> {
    const fileKey = generateUniqueFileName(fileName);

    const command = new PutObjectCommand({
      Bucket: this.storageConfig.DOCUMENTS_BUCKET,
      Key: fileKey,
      ContentType: fileType,
      ContentDisposition: "inline",
      Body: document,
    });

    return pipe(
      te.tryCatch(
        () => this.s3.send(command),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${S3DocumentFilesStorage.name} when storing the file ${fileName} (${fileType}, under key "${fileKey}").`,
            cause: error as Error,
          }),
      ),
      te.map((_output) => ({ fileKey })),
    )();
  }

  public delete({ fileKey }: DeleteDocumentFileParams): Promise<Either<IrrecoverableError, void>> {
    const command = new DeleteObjectCommand({
      Bucket: this.storageConfig.DOCUMENTS_BUCKET,
      Key: fileKey,
    });

    return pipe(
      te.tryCatch(
        () => this.s3.send(command),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${S3DocumentFilesStorage.name} when deleting the file of key "${fileKey}".`,
            cause: error as Error,
          }),
      ),
      te.map((_output) => {}),
    )();
  }

  public activateDocumentFile({ fileKey }: ActivateDocumentFileParams) {
    const command = new PutObjectTaggingCommand({
      Bucket: this.storageConfig.DOCUMENTS_BUCKET,
      Key: fileKey,
      Tagging: {
        TagSet: [{ Key: "status", Value: "activated" }],
      },
    });

    return pipe(
      te.tryCatch(
        () => this.s3.send(command),
        (error) => {
          if (error instanceof NoSuchKey) {
            return new DocumentFileCannotBeActivatedError(fileKey);
          }

          return new IrrecoverableError({
            message: `Error occurred in ${S3DocumentFilesStorage.name} when activating the file of key "${fileKey}".`,
            cause: error as Error,
          });
        },
      ),
      te.map((_output) => {}),
    )();
  }

  public getSignedUploadUrl({
    fileName,
    fileType,
  }: GetSignedUploadUrlParams): Promise<Either<IrrecoverableError, GetSignedUploadUrlResult>> {
    const fileKey = generateUniqueFileName(fileName);
    const command = new PutObjectCommand({
      Bucket: this.storageConfig.DOCUMENTS_BUCKET,
      Key: fileKey,
      ContentType: fileType,
      ContentDisposition: "inline",
    });

    return pipe(
      te.tryCatch(
        () => getSignedUrl(this.s3, command, { expiresIn: 3600 }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${S3DocumentFilesStorage.name} when generating signed URL for file "${fileName}" (${fileType}).`,
            cause: error as Error,
          }),
      ),
      te.map((bucketUrl) => ({ fileKey, bucketUrl })),
    )();
  }
}
