import type { UUID } from "@/common/uuid";
import { DocumentFilesStorage } from "@/modules/patient/storage/document-files.storage";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { MIMEType } from "node:util";

type Params = {
  patientId: UUID;
  accountId: UUID;
  documentFileType: MIMEType;
  documentFileName: string;
  documentFileSize: number;
};

/**
 * Gets a signed URL to upload a document file to the documents
 * file storage. The front-end might want to use this to upload
 * the document before actually registering (and thus activating)
 * it in the system.
 */
@Injectable()
export class SignDocumentUploadUrlService {
  public constructor(
    private readonly documentsFilesStorage: DocumentFilesStorage,
    private readonly verifyProfessionalIsAuthorized: VerifyProfessionalIsAuthorizedService,
  ) {}

  public async execute({
    documentFileType,
    documentFileName,
    documentFileSize,
    accountId,
    patientId,
  }: Params) {
    return pipe(
      () => this.verifyProfessionalIsAuthorized.execute({ patientId, accountId }),
      te.chainW(
        () => () =>
          this.documentsFilesStorage.getSignedUploadUrl({
            fileName: documentFileName,
            fileType: documentFileType.toString(),
            fileSize: documentFileSize,
          }),
      ),
    )();
  }
}
