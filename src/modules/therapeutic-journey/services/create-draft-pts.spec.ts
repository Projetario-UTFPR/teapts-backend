import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { PatientAlreadyHasActivePtsError } from "@/modules/therapeutic-journey/errors/patient-already-has-active-pts.error";
import { CreateDraftPtsService } from "@/modules/therapeutic-journey/services/create-draft-pts.service";
import { faker } from "@faker-js/faker";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { InMemoryAccountsRepository } from "@test/mocks/repositories/in-memory/accounts.repository";
import { InMemoryProfessionalsRepository } from "@test/mocks/repositories/in-memory/professionals.repository";
import { InMemoryPtsRepository } from "@test/mocks/repositories/in-memory/pts.repository";
import { either } from "fp-ts";

describe("[Service] Create Draft PTS Service", async () => {
  let ptsRepository: InMemoryPtsRepository;
  let accountsRepository: InMemoryAccountsRepository;
  let professionalsRepository: InMemoryProfessionalsRepository;
  let sut: CreateDraftPtsService;

  beforeEach(() => {
    ptsRepository = new InMemoryPtsRepository();
    accountsRepository = new InMemoryAccountsRepository();
    professionalsRepository = new InMemoryProfessionalsRepository();
    sut = new CreateDraftPtsService(ptsRepository, accountsRepository, professionalsRepository);
  });

  const getEntities = async () => {
    const patientAccount = await accountsFactory.create();
    const patientResult = await patientsFactory.create({ accountId: patientAccount.getId() });

    assert(either.isRight(patientResult));

    const patient = patientResult.right;
    const professional = await professionalsFactory.create();

    accountsRepository.accounts.push(patientAccount);
    professionalsRepository.professionals.push(professional);

    return { patientAccount, patient, professional };
  };

  test("successfull creation contracts", async () => {
    const { patient, professional } = await getEntities();

    const result = await sut.execute({
      patientId: patient.getId(),
      professionalId: professional.getId(),
      socialSituation: faker.lorem.paragraphs(5),
    });

    assert(either.isRight(result), "it should have created the PTS successfully");

    const pts = result.right;

    expect(
      pts.isResponsabilityOfProfessional(professional),
      "the professional creating the PTS should become the responsible professional for it",
    ).toBe(true);

    expect(
      pts.belongsToPatient(patient),
      "the PTS should belong to the patient whom the profissional created it for",
    ).toBe(true);

    expect(
      pts.toSnapshot().multidisciplinaryTeamIds.length,
      "it should contain an empty multidisciplinary team when no initial team has been provided",
    ).toBe(0);
  });

  it("should allow to create a PTS with a initial multidisciplinary team defined", async () => {
    const { patient, professional } = await getEntities();

    const professionals = await Promise.all(
      Array.from({ length: 10 }).map(() => professionalsFactory.create()),
    );

    const multidisciplinaryTeamIds = professionals.map((professional) => professional.getId());

    const result = await sut.execute({
      patientId: patient.getId(),
      professionalId: professional.getId(),
      socialSituation: faker.lorem.paragraphs(5),
      multidisciplinaryTeamIds,
    });

    assert(either.isRight(result));

    const pts = result.right;
    expect(pts.toSnapshot().multidisciplinaryTeamIds).toEqual(
      expect.arrayContaining(multidisciplinaryTeamIds),
    );
  });

  it("should silently refuse to include the responsible professional in the list of ids of the professionals from the multidisciplinary team", async () => {
    const { patient, professional } = await getEntities();

    const professionals = await Promise.all(
      Array.from({ length: 10 }).map(() => professionalsFactory.create()),
    );

    const multidisciplinaryTeamIds = [
      professional.getId(),
      ...professionals.map((professional) => professional.getId()),
    ];

    const result = await sut.execute({
      patientId: patient.getId(),
      professionalId: professional.getId(),
      socialSituation: faker.lorem.paragraphs(5),
      multidisciplinaryTeamIds,
    });

    assert(either.isRight(result));

    const pts = result.right;

    expect(pts.toSnapshot().multidisciplinaryTeamIds).not.toEqual(
      expect.arrayContaining([professional.getId()]),
    );
  });

  it("should not let no professional create a new PTS for a patient that already has an active PTS", async () => {
    const { patient, professional } = await getEntities();

    const ptsResult = await ptsFactory.create({ patientId: patient.getId() });
    assert(either.isRight(ptsResult));

    const pts = ptsResult.right;
    assert(either.isRight(pts.acceptAndBeginPlanning()));

    ptsRepository.items.push(pts);

    const result = await sut.execute({
      patientId: patient.getId(),
      professionalId: professional.getId(),
      socialSituation: faker.lorem.paragraphs(5),
    });

    assert(
      either.isLeft(result),
      "it should not let another PTS be created for a " +
        "patient when the patient already has an active PTS",
    );

    expect(
      result.left,
      "it should deny it because patient already has an active PTS",
    ).toBeInstanceOf(PatientAlreadyHasActivePtsError);
  });

  it("should not allow any entity but a professional to create a PTS", async () => {
    const { patient } = await getEntities();
    const anotherAccount = await accountsFactory.create();
    accountsRepository.accounts.push(anotherAccount);

    const result = await sut.execute({
      patientId: patient.getId(),
      professionalId: anotherAccount.getId(),
      socialSituation: faker.lorem.paragraph(),
    });

    assert(
      either.isLeft(result),
      "it should not have let a ordinary account, with no professional profiles, create a PTS for a patient",
    );

    expect(result.left).toBeInstanceOf(ProfessionalProfileNotFoundError);
  });
});
