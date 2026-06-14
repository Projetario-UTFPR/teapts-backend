import { AddNewDocumentToProntuarioService } from "@/modules/patient/services/add-new-document-to-prontuario.service";
import { ProfessionalNotAuthorizedToAccessPts } from "@/modules/therapeutic-journey/errors/professional-not-authorized-to-access-pts.error";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { InMemoryDocumentFilesStorage } from "@test/mocks/file-storages/in-memory/documents-file-storage";
import { InMemoryAccountsRepository } from "@test/mocks/repositories/in-memory/accounts.repository";
import { InMemoryDocumentsRepository } from "@test/mocks/repositories/in-memory/documents.repository";
import { InMemoryPtsRepository } from "@test/mocks/repositories/in-memory/pts.repository";
import { either } from "fp-ts";
import { MIMEType } from "node:util";

describe("[Service] Add New Documento to Prontuario", async () => {
  let ptsRepository: InMemoryPtsRepository;
  let accountsRepository: InMemoryAccountsRepository;
  let documentsFileStorage: InMemoryDocumentFilesStorage;
  let documentsRepository: InMemoryDocumentsRepository;

  let verifyProfessionalIsAuthorizedService: VerifyProfessionalIsAuthorizedService;
  let sut: AddNewDocumentToProntuarioService;

  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository();
    ptsRepository = new InMemoryPtsRepository();
    documentsRepository = new InMemoryDocumentsRepository();
    documentsFileStorage = new InMemoryDocumentFilesStorage();

    verifyProfessionalIsAuthorizedService = new VerifyProfessionalIsAuthorizedService(
      ptsRepository,
      accountsRepository,
    );
    documentsRepository = new InMemoryDocumentsRepository();

    sut = new AddNewDocumentToProntuarioService(
      documentsFileStorage,
      verifyProfessionalIsAuthorizedService,
      documentsRepository,
    );
  });

  const getValidEntities = async () => {
    const professionalAccount = await accountsFactory.create();
    const professional = await professionalsFactory.create({ account: professionalAccount });

    const patientAccount = await accountsFactory.create();
    const patient = await patientsFactory.create({ accountId: patientAccount.getId() });
    const pts = await ptsFactory.create({
      patientId: patient.getId(),
      responsibleProfessionalId: professional.getId(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    ptsRepository.items.push(pts);
    accountsRepository.accounts.push(patientAccount, professionalAccount);

    // we are bypassing the document actual insertion — if not activated, it is to be deleted soon anyway.
    // also, testing whether it should be uploaded is outta scope; go test `SignDocumentUploadUrlService`
    // instead.
    const documentResult = await documentsFileStorage.uploadPendingDocumentFile({
      document: Buffer.from("test"),
      fileName: "test.txt",
      fileType: new MIMEType("application/text").toString(),
    });

    assert(either.isRight(documentResult), "it should had created a document for this test");

    return {
      professionalAccount,
      professional,
      patientAccount,
      patient,
      pts,
      document: documentResult.right,
    };
  };

  it(
    "should only allow members of the multidisciplinary " +
      "team to add/activate new documents to a patient's prontuário",
    async () => {
      const spy = vi.spyOn(VerifyProfessionalIsAuthorizedService.prototype, "execute");
      const { patient, document } = await getValidEntities();

      const nonMemberProfessionalAccount = await accountsFactory.create();
      const nonMemberProfessional = await professionalsFactory.create({
        account: nonMemberProfessionalAccount,
      });

      const result = await sut.execute({
        assigneeProfessionalId: nonMemberProfessional.getId(),
        documentFileKey: document.fileKey,
        documentTitle: "Test Document",
        patientId: patient.getId(),
        account: nonMemberProfessionalAccount,
      });

      expect(either.isRight(result)).toBe(false);
      expect(result["left"]).toBeInstanceOf(ProfessionalNotAuthorizedToAccessPts);

      expect(
        spy,
        "it should rely on `VerifyProfessionalIsAuthorizedService` to guard the PTS access",
      ).toHaveBeenCalled();
    },
  );

  it("should activate a previously document and register it when successful", async () => {
    const spy = vi.spyOn(VerifyProfessionalIsAuthorizedService.prototype, "execute");
    const { professional, patient, document, professionalAccount } = await getValidEntities();

    const result = await sut.execute({
      assigneeProfessionalId: professional.getId(),
      documentFileKey: document.fileKey,
      documentTitle: "Test Document",
      patientId: patient.getId(),
      account: professionalAccount,
    });

    expect(either.isRight(result)).toBe(true);
    expect(documentsFileStorage.documentFiles.get(document.fileKey)?.active).toBe(true);
    expect(documentsRepository.items.length).toBe(1);
    expect(documentsRepository.items[0].toSnapshot().documentFileKey).toBe(document.fileKey);

    expect(
      spy,
      "it should rely on `VerifyProfessionalIsAuthorizedService` to guard the PTS access",
    ).toHaveBeenCalled();
  });

  it("should not allow any professional if the PTS hasn't been accepted yet", async () => {
    const spy = vi.spyOn(VerifyProfessionalIsAuthorizedService.prototype, "execute");
    const { patient, professional, document, professionalAccount } = await getValidEntities();
    const pts = await ptsFactory.create({
      patientId: patient.getId(),
      responsibleProfessionalId: professional.getId(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Draft }),
    });

    // cannot be a push! we need to replace the active one inserted by `getValidEntities`
    ptsRepository.items = [pts];
    expect(pts.isActive()).toBe(false);

    const result = await sut.execute({
      assigneeProfessionalId: professional.getId(),
      documentFileKey: document.fileKey,
      documentTitle: "Test Document",
      patientId: patient.getId(),
      account: professionalAccount,
    });

    expect(either.isLeft(result)).toBe(true);
    expect(result["left"]).toBeInstanceOf(ProfessionalNotAuthorizedToAccessPts);
    expect(
      spy,
      "it should rely on `VerifyProfessionalIsAuthorizedService` to guard the PTS access",
    ).toHaveBeenCalled();
  });
});
