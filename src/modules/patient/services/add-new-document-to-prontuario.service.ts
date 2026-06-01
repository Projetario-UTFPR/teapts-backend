import { type UUID } from "@/common/uuid";
import { Document } from "@/modules/patient/aggregates/document.aggregate";
import { DocumentsRepository } from "@/modules/patient/repositories/documents.repository";
import { DocumentFilesStorage } from "@/modules/patient/storage/document-files.storage";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = {
  patientId: UUID;
  assigneeProfessionalId: UUID;
  documentFileKey: string;
  documentTitle: string;
  documentDescription?: string;
};

/**
 * This service registers the document in the system's datastore and activate the
 * actual uploaded file.
 *
 * @note Before using it, be sure the document identified by `documentFileKey` has already
 * been uploaded to the file storage, otherwise an error will be returned.
 */
@Injectable()
export class AddNewDocumentToProntuarioService {
  public constructor(
    private readonly documentsFilesStorage: DocumentFilesStorage,
    private readonly verifyProfessionalIsAuthorized: VerifyProfessionalIsAuthorizedService,
    private readonly documentsRepository: DocumentsRepository,
  ) {}

  public async execute({
    assigneeProfessionalId,
    patientId,
    documentTitle,
    documentDescription,
    documentFileKey,
  }: Params) {
    return pipe(
      () =>
        this.verifyProfessionalIsAuthorized.execute({
          patientId,
          professionalId: assigneeProfessionalId,
        }),
      te.chainW(() =>
        this.trySaveDocumentOrElseRemoveFileDescriptor(
          documentFileKey,
          patientId,
          documentTitle,
          documentDescription,
        ),
      ),
      te.chainW(
        () => () => this.documentsFilesStorage.activateDocumentFile({ fileKey: documentFileKey }),
      ),
    )();
  }

  private trySaveDocumentOrElseRemoveFileDescriptor(
    fileKey: string,
    patientId: UUID,
    title: string,
    description: string | undefined,
  ) {
    const document = Document.create({
      documentFileKey: fileKey,
      patientId,
      title,
      description,
    });

    return pipe(
      () => this.documentsRepository.createDocument(document),
      te.orLeft((_irrecoverableError) => () => this.documentsFilesStorage.delete({ fileKey })),
    );
  }
}
