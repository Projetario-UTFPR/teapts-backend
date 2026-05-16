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

  it("should allow to create a PTS with a initial multidisciplinary team defined", async () => {});

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
});
