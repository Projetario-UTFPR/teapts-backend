import { AppModule } from "@/app.module";
import { generateUUID } from "@/common/uuid";
import { AssignTokenService } from "@/infra/auth/assign-token.service";
import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { either as e, either } from "fp-ts";
import request from "supertest";
import type { App } from "supertest/types";

describe("[e2e] PTS Controller (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;

  let account: Account;
  let professional: Professional;
  let patient: Patient;
  let professionalAccountToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);
  });

  beforeEach(async () => {
    account = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678" },
      { hasher },
    );

    professional = await professionalsFactory.createAndPersist(prisma, {
      accountId: account.getId(),
    });

    patient = await patientsFactory.createAndPersist(prisma);

    const accessTokenResult = await tokensService.execute({ account });
    assert(e.isRight(accessTokenResult));
    professionalAccountToken = accessTokenResult.right.accessToken;

    assert(
      professional.getAccountId() === account.getId(),
      "factory should correctly set the given account id",
    );
  });

  const getValidParams = () => ({
    professionalId: professional.getId(),
    patientId: patient.getId(),
    socialSituation: "Mora sozinho, sem suporte familiar.",
    multidisciplinaryTeamIds: [],
  });

  const assertIsValidationErrorsBag = (response: request.Response) => {
    expect(response.body, "response should be a validation bag object").toHaveProperty("errors");
  };

  test("create PTS route requires authentication", async () => {
    await request(app.getHttpServer()).post("/v1/pts/create").send(getValidParams()).expect(401);
  });

  it.each([
    [{ professionalId: undefined }, "professionalId"] as const,
    [{ patientId: undefined }, "patientId"] as const,
    [{ socialSituation: undefined }, "socialSituation"] as const,
  ])("should return 422 when `$1` is missing", async (override, missingProperty) => {
    const body = {
      ...getValidParams(),
      ...override,
    };

    const response = await request(app.getHttpServer())
      .post("/v1/pts/create")
      .set({ authorization: `Bearer ${professionalAccountToken}` })
      .send(body)
      .expect(422);

    assertIsValidationErrorsBag(response);
    expect(response.body.errors).toHaveProperty(missingProperty);
  });

  it("should return 403 when the professionalId does not belong to the authenticated account", async () => {
    // a second account whose professional will NOT belong to the first account
    const anotherAccount = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345657" },
      { hasher },
    );

    const anotherAccessTokenResult = await tokensService.execute({ account: anotherAccount });
    assert(either.isRight(anotherAccessTokenResult));
    const { accessToken } = anotherAccessTokenResult.right;

    // the authenticated user is `anotherAccount`, but `professionalId` belongs to (first) `account`
    // hence it should not get to create the PTS
    const body = {
      ...getValidParams(),
      professionalId: professional.getId(),
      accountId: anotherAccount.getId(),
    };

    const response = await request(app.getHttpServer())
      .post("/v1/pts/create")
      .set({ authorization: `Bearer ${accessToken}` })
      .send(body)
      .expect(403);

    expect(response.body).toHaveProperty("message");
  });

  it("should return 403 when the professionalId does not exist at all", async () => {
    // ensure the ID does not exist
    const nonExistingProfessionalId = generateUUID();
    prisma.professional.delete({ where: { id: nonExistingProfessionalId } });

    const response = await request(app.getHttpServer())
      .post("/v1/pts/create")
      .set({ authorization: `Bearer ${professionalAccountToken}` })
      .send({ ...getValidParams(), professionalId: nonExistingProfessionalId })
      .expect(403);

    expect(response.body).toHaveProperty("message");
  });

  it("should return 409 when the patient already has an active PTS", async () => {
    // note that `getValidParams()` returns the same patient, professional and account
    const params = getValidParams();

    const pts = await ptsFactory.createAndPersist(prisma, params);
    pts.acceptAndBeginPlanning();

    await prisma.projetoTerapeuticoSingular.update({
      data: ptsMapper.intoPrisma(pts),
      where: { id: pts.getId().toString() },
    });

    // second creation for the same patient should fail due to conflict
    const conflictResponse = await request(app.getHttpServer())
      .post("/v1/pts/create")
      .set({ authorization: `Bearer ${professionalAccountToken}` })
      .send(params)
      .expect(409);

    expect(conflictResponse.body).toHaveProperty("message");
  });

  it("should draft a PTS successfully", async () => {
    const newPatient = await patientsFactory.createAndPersist(prisma);

    const existingPtsForNewPatientPriorToCreation = await prisma.projetoTerapeuticoSingular.count({
      where: { patientId: newPatient.getId().toString() },
    });

    expect(
      existingPtsForNewPatientPriorToCreation,
      "there should be 0 PTS for the newly created patient",
    ).toBe(0);

    await request(app.getHttpServer())
      .post("/v1/pts/create")
      .set({ authorization: `Bearer ${professionalAccountToken}` })
      .send({ ...getValidParams(), patientId: newPatient.getId() })
      .expect(201);

    const existingPtsForNewPatient = await prisma.projetoTerapeuticoSingular.count({
      where: { patientId: newPatient.getId().toString() },
    });

    expect(existingPtsForNewPatient, "it should have created a new PTS for the patient").toBe(1);
  });

  it("should require every professional from the multidisciplinary team to exist", async () => {
    const secondProfessionalNotPersisted = await professionalsFactory.create();

    const body = {
      ...getValidParams(),
      multidisciplinaryTeamIds: [secondProfessionalNotPersisted.getId()],
    };

    await request(app.getHttpServer())
      .post("/v1/pts/create")
      .set({ authorization: `Bearer ${professionalAccountToken}` })
      .send(body)
      .expect(400);

    const persistedPts = await prisma.projetoTerapeuticoSingular.count({
      where: { patientId: patient.getId().toString() },
    });

    expect(persistedPts, "it should not have created the PTS").toBe(0);
  });

  it("should draft a PTS with multidisciplinary team members successfully", async () => {
    const newPatient = await patientsFactory.createAndPersist(prisma);

    const teamMember1 = await professionalsFactory.createAndPersist(prisma, {
      accountId: account.getId(),
    });

    const teamMember2 = await professionalsFactory.createAndPersist(prisma, {
      accountId: account.getId(),
    });

    const inputMembersIds = [teamMember1.getId(), teamMember2.getId()];
    const body = {
      ...getValidParams(),
      patientId: newPatient.getId(),
      multidisciplinaryTeamIds: inputMembersIds,
    };

    await request(app.getHttpServer())
      .post("/v1/pts/create")
      .set({ authorization: `Bearer ${professionalAccountToken}` })
      .send(body)
      .expect(201);

    const newPts = await prisma.projetoTerapeuticoSingular.findFirstOrThrow({
      where: { patientId: newPatient.getId().toString() },
      include: { multidisciplinaryTeam: { select: { professionalId: true } } },
    });

    const membersInTheMultidisciplinaryTeamOfPts = newPts.multidisciplinaryTeam.map(
      (team) => team.professionalId,
    );

    expect(
      membersInTheMultidisciplinaryTeamOfPts,
      "it should have put every input member in the initial multidisciplinary team",
    ).toEqual(expect.arrayContaining(inputMembersIds));

    expect(
      membersInTheMultidisciplinaryTeamOfPts.length,
      "it should not have added more members than requested",
    ).toBe(inputMembersIds.length);
  });
});
