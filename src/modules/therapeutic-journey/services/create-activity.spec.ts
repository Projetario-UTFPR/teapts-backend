import { InMemoryProfessionalsRepository } from "@test/mocks/repositories/in-memory/professionals.repository";
import { InMemoryPtsRepository } from "@test/mocks/repositories/in-memory/pts.repository";
import { describe, beforeEach } from "vitest";
import { CreateActivityService } from "./create-activity.service";
import { InMemoryDocumentsRepository } from "@test/mocks/repositories/in-memory/documents.repository";
import { InMemoryActivityRepository } from "@test/mocks/repositories/in-memory/acitivities.repository";
import { generateUUID } from "@/common/uuid";
import activityFactory from "@test/factories/activity.factory";
import { either as e } from "fp-ts";
import accountsFactory from "@test/factories/accounts.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { ProfessionalDoesNotBelongToUserAccountError } from "../errors/professional-does-not-belong-to-user-account.error";
import { ProfessionalNotAuthorizedToAccessPts } from "../errors/professional-not-authorized-to-access-pts.error";
import { Activity } from "../aggregates/activity.aggregate";
import { PtsTimeline } from "../value-objects/pts-timeline.vo";
import documentsFactory from "@test/factories/documents.factory";
import { CannotAttachDocumentError } from "../errors/cannot-attach-document.error";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { InMemoryAccountsRepository } from "@test/mocks/repositories/in-memory/accounts.repository";

describe("[Service] Create Activity Service", () => {
  let activityRepository: InMemoryActivityRepository;
  let documentsRepo: InMemoryDocumentsRepository;
  let ptsRepo: InMemoryPtsRepository;
  let professionalsRepo: InMemoryProfessionalsRepository;
  let accountsRepo: InMemoryAccountsRepository;
  let verifyProfessionalService: VerifyProfessionalIsAuthorizedService;
  let sut: CreateActivityService;

  beforeEach(() => {
    activityRepository = new InMemoryActivityRepository();
    documentsRepo = new InMemoryDocumentsRepository();
    professionalsRepo = new InMemoryProfessionalsRepository();
    ptsRepo = new InMemoryPtsRepository(professionalsRepo);
    accountsRepo = new InMemoryAccountsRepository();
    verifyProfessionalService = new VerifyProfessionalIsAuthorizedService(ptsRepo, accountsRepo);
    sut = new CreateActivityService(activityRepository, documentsRepo, verifyProfessionalService);
  });

  const getEntities = async () => {
    const account = await accountsFactory.create();
    const professional = await professionalsFactory.create({ account });
    const patientId = generateUUID();

    const documentOne = await documentsFactory.create({ patientId });
    const documentTwo = await documentsFactory.create({ patientId });

    const pts = await ptsFactory.create({
      patientId,
      responsibleProfessionalId: professional.getId(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });
    pts.updateMultidisciplinaryTeam([professional.getId()]);

    accountsRepo.accounts.push(account);
    professionalsRepo.professionals.push(professional);
    ptsRepo.items.push(pts);
    documentsRepo.items.push(documentOne);
    documentsRepo.items.push(documentTwo);

    const documents = {
      documentOne,
      documentTwo,
    };

    return { account, professional, documents, pts, patientId };
  };

  it("should successfully create activity when everything is correct", async () => {
    const { account, documents, professional, patientId } = await getEntities();

    const result = await sut.execute({
      accountId: account.getId(),
      professionalId: professional.getId(),
      patientId,
      title: "Regulação de sono",
      documentsIds: [documents.documentOne.getId(), documents.documentTwo.getId()],
      frequency: activityFactory.generateRandomFrequency(),
    });

    expect(e.isRight(result)).toBe(true);

    assert(e.isRight(result));

    expect(result.right.getTitle()).toBe("Regulação de sono");

    expect(activityRepository.items).toHaveLength(1);
    expect(activityRepository.items[0].getId()).toBe(result.right.getId());

    expect(result.right.getAssigneProfessionalId()).toBe(professional.getId());
    expect(result.right.getState()).toBe(Activity.State.Suggested);
  });

  it("should deny activity creation when professional does not belong to account", async () => {
    const { account, patientId } = await getEntities();

    const otherAccount = await accountsFactory.create();
    const otherProfessional = await professionalsFactory.create({ account: otherAccount });

    professionalsRepo.professionals.push(otherProfessional);

    const result = await sut.execute({
      accountId: account.getId(),
      professionalId: otherProfessional.getId(),
      patientId,
      title: "Regulação de sono",
      documentsIds: [],
      frequency: activityFactory.generateRandomFrequency(),
    });

    expect(e.isLeft(result)).toBe(true);

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(ProfessionalDoesNotBelongToUserAccountError);
  });

  it("should deny activity creation when professional does not belong to multidisciplinary team", async () => {
    const { account, professional } = await getEntities();

    const newPatientId = generateUUID();
    const pts = await ptsFactory.create({
      patientId: newPatientId,
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    ptsRepo.items.push(pts);

    const result = await sut.execute({
      accountId: account.getId(),
      professionalId: professional.getId(),
      patientId: newPatientId,
      title: "Regulação de sono",
      documentsIds: [],
      frequency: activityFactory.generateRandomFrequency(),
    });

    expect(e.isLeft(result)).toBe(true);

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(ProfessionalNotAuthorizedToAccessPts);
  });

  it("should deny activity creation when document does not belong to patient", async () => {
    const { account, documents, professional, patientId } = await getEntities();

    const notPatientDocument = await documentsFactory.create();

    const result = await sut.execute({
      accountId: account.getId(),
      professionalId: professional.getId(),
      patientId,
      title: "Regulação de sono",
      documentsIds: [
        documents.documentOne.getId(),
        documents.documentTwo.getId(),
        notPatientDocument.getId(),
      ],
      frequency: activityFactory.generateRandomFrequency(),
    });

    expect(e.isLeft(result)).toBe(true);

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(CannotAttachDocumentError);
  });

  it("should deny activity creation when document does not belong to patient", async () => {
    const { account, documents, professional, patientId } = await getEntities();

    const notPatientDocument = await documentsFactory.create();
    documentsRepo.items.push(notPatientDocument);

    const result = await sut.execute({
      accountId: account.getId(),
      professionalId: professional.getId(),
      patientId,
      title: "Regulação de sono",
      documentsIds: [
        documents.documentOne.getId(),
        documents.documentTwo.getId(),
        notPatientDocument.getId(),
      ],
      frequency: activityFactory.generateRandomFrequency(),
    });

    expect(e.isLeft(result)).toBe(true);

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(CannotAttachDocumentError);
  });
});
