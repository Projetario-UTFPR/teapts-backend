import { generateUUID } from "@/common/uuid";
import { AssignTokenService } from "@/infra/auth/assign-token.service";
import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import documentsFactory from "@test/factories/documents.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
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
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    account = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678" },
      { hasher },
    );

    professional = await professionalsFactory.createAndPersist(prisma, { account: account });

    patient = await patientsFactory.createAndPersist(prisma);

    const accessTokenResult = await tokensService.execute({ account });
    if (e.isLeft(accessTokenResult)) {
      throw new Error("Didn't issued an access token correctly for the test.");
    }

    professionalAccountToken = accessTokenResult.right.accessToken;
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

  test("create PTS route requires authentication", { tags: ["storeNewPts"] }, async () => {
    await request(app.getHttpServer()).post("/v1/pts/create").send(getValidParams()).expect(401);
  });

  it.each([
    [{ professionalId: undefined }, "professionalId"] as const,
    [{ patientId: undefined }, "patientId"] as const,
    [{ socialSituation: undefined }, "socialSituation"] as const,
  ])(
    "should return 422 when `$1` is missing",
    { tags: ["storeNewPts"] },
    async (override, missingProperty) => {
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
    },
  );

  it(
    "should return 403 when the professionalId does not belong to the authenticated account",
    { tags: ["storeNewPts"] },
    async () => {
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
    },
  );

  it(
    "should return 403 when the professionalId does not exist at all",
    { tags: ["storeNewPts"] },
    async () => {
      // ensure the ID does not exist
      const nonExistingProfessionalId = generateUUID();
      prisma.professional.delete({ where: { id: nonExistingProfessionalId } });

      const response = await request(app.getHttpServer())
        .post("/v1/pts/create")
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send({ ...getValidParams(), professionalId: nonExistingProfessionalId })
        .expect(403);

      expect(response.body).toHaveProperty("message");
    },
  );

  it(
    "should return 409 when the patient already has an active PTS",
    { tags: ["storeNewPts"] },
    async () => {
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
    },
  );

  it("should draft a PTS successfully", { tags: ["storeNewPts"] }, async () => {
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

  it(
    "should require every professional from the multidisciplinary team to exist",
    { tags: ["storeNewPts"] },
    async () => {
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
    },
  );

  it(
    "should draft a PTS with multidisciplinary team members successfully",
    { tags: ["storeNewPts"] },
    async () => {
      const newPatient = await patientsFactory.createAndPersist(prisma);

      const teamMember1 = await professionalsFactory.createAndPersist(prisma, { account: account });
      const teamMember2 = await professionalsFactory.createAndPersist(prisma, { account: account });

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
    },
  );

  describe("PUT /v1/pts/update/multidisciplinary-team", () => {
    test(
      "update multidisciplinary team route requires authentication",
      { tags: ["updatePtsTeam"] },
      async () => {
        await request(app.getHttpServer())
          .put("/v1/pts/update/multidisciplinary-team")
          .send({
            ptsId: generateUUID().toString(),
            professionalId: professional.getId().toString(),
            multidisciplinaryTeamIds: [],
          })
          .expect(401);
      },
    );

    it.each([
      [{ ptsId: undefined }, "ptsId"] as const,
      [{ professionalId: undefined }, "professionalId"] as const,
      [{ multidisciplinaryTeamIds: undefined }, "multidisciplinaryTeamIds"] as const,
    ])(
      "should return 422 when `$1` is missing",
      { tags: ["updatePtsTeam"] },
      async (override, missingProperty) => {
        const body = {
          ptsId: generateUUID().toString(),
          professionalId: professional.getId().toString(),
          multidisciplinaryTeamIds: [],
          ...override,
        };

        const response = await request(app.getHttpServer())
          .put("/v1/pts/update/multidisciplinary-team")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(422);

        assertIsValidationErrorsBag(response);
        expect(response.body.errors).toHaveProperty(missingProperty);
      },
    );

    it("should return 404 when the PTS does not exist", { tags: ["updatePtsTeam"] }, async () => {
      const body = {
        ptsId: generateUUID().toString(),
        professionalId: professional.getId().toString(),
        multidisciplinaryTeamIds: [],
      };

      const response = await request(app.getHttpServer())
        .put("/v1/pts/update/multidisciplinary-team")
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(404);

      expect(response.body).toHaveProperty("message");
    });

    it(
      "should return 403 when the professional is not the responsible for the PTS",
      { tags: ["updatePtsTeam"] },
      async () => {
        const realResponsible = await professionalsFactory.createAndPersist(prisma, { account });

        const pts = await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          responsibleProfessionalId: realResponsible.getId(),
          multidisciplinaryTeamIds: [],
        });

        const body = {
          ptsId: pts.getId().toString(),
          professionalId: professional.getId().toString(),
          multidisciplinaryTeamIds: [],
        };

        const response = await request(app.getHttpServer())
          .put("/v1/pts/update/multidisciplinary-team")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(403);

        expect(response.body).toHaveProperty("message");
      },
    );

    it(
      "should return 400 when a new team member is not a registered professional",
      { tags: ["updatePtsTeam"] },
      async () => {
        const pts = await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          responsibleProfessionalId: professional.getId(),
          multidisciplinaryTeamIds: [],
        });

        const nonExistingProfessionalId = generateUUID().toString();

        const body = {
          ptsId: pts.getId().toString(),
          professionalId: professional.getId().toString(),
          multidisciplinaryTeamIds: [nonExistingProfessionalId],
        };

        await request(app.getHttpServer())
          .put("/v1/pts/update/multidisciplinary-team")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(400);
      },
    );

    it(
      "should update the multidisciplinary team applying WatchedList behavior (add new, remove omitted, keep untouched)",
      { tags: ["updatePtsTeam"] },
      async () => {
        const responsible = professional;
        const memberToKeep = await professionalsFactory.createAndPersist(prisma, { account });
        const memberToRemove = await professionalsFactory.createAndPersist(prisma, { account });

        const pts = await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          responsibleProfessionalId: responsible.getId(),
          multidisciplinaryTeamIds: [
            responsible.getId(),
            memberToKeep.getId(),
            memberToRemove.getId(),
          ],
        });

        const newMemberToAdd = await professionalsFactory.createAndPersist(prisma, { account });

        const body = {
          ptsId: pts.getId().toString(),
          professionalId: responsible.getId().toString(),
          multidisciplinaryTeamIds: [
            responsible.getId().toString(),
            memberToKeep.getId().toString(),
            newMemberToAdd.getId().toString(),
          ],
        };

        await request(app.getHttpServer())
          .put("/v1/pts/update/multidisciplinary-team")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(204);

        const updatedPts = await prisma.projetoTerapeuticoSingular.findUniqueOrThrow({
          where: { id: pts.getId().toString() },
          include: { multidisciplinaryTeam: true },
        });

        const teamMemberIdsInDb = updatedPts.multidisciplinaryTeam.map(
          (member) => member.professionalId,
        );

        expect(teamMemberIdsInDb).toHaveLength(2);

        expect(teamMemberIdsInDb).toContain(memberToKeep.getId().toString());

        expect(teamMemberIdsInDb).toContain(newMemberToAdd.getId().toString());

        expect(teamMemberIdsInDb).not.toContain(memberToRemove.getId().toString());
      },
    );

    it(
      "should return 400 when the responsible tries to remove themselves without providing a substitute",
      { tags: ["updatePtsTeam"] },
      async () => {
        const pts = await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          responsibleProfessionalId: professional.getId(),
          multidisciplinaryTeamIds: [professional.getId()],
        });

        const body = {
          ptsId: pts.getId().toString(),
          professionalId: professional.getId().toString(),
          multidisciplinaryTeamIds: [generateUUID().toString()],
        };

        const response = await request(app.getHttpServer())
          .put("/v1/pts/update/multidisciplinary-team")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(400);

        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toMatch(
          `Responsável precisa prover ID de substituto quando busca revogar sua responsabilidade.`,
        );
      },
    );
  });

  describe("PUT /v1/pts/activity/create", () => {
    const getValidActivityParams = (documentId?: string) => ({
      professionalId: professional.getId().toString(),
      patientId: patient.getId().toString(),
      title: "Caminhada Assistida e Mobilidade",
      frequency: {
        times: 3,
        interval: "week",
      },
      documentsIds: documentId ? [documentId] : [],
    });

    test("create activity route requires authentication", { tags: ["createActivity"] }, async () => {
      await request(app.getHttpServer())
        .put("/v1/pts/activity/create")
        .send(getValidActivityParams())
        .expect(401);
    });

    it.each([
      [{ professionalId: undefined }, "professionalId"] as const,
      [{ patientId: undefined }, "patientId"] as const,
      [{ title: undefined }, "title"] as const,
      [{ frequency: undefined }, "frequency"] as const,
    ])(
      "should return 422 when `$1` is missing",
      { tags: ["createActivity"] },
      async (override, missingProperty) => {
        const body = {
          ...getValidActivityParams(),
          ...override,
        };

        const response = await request(app.getHttpServer())
          .put("/v1/pts/activity/create")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(422);

        assertIsValidationErrorsBag(response);
        expect(response.body.errors).toHaveProperty(missingProperty);
      },
    );

    it(
      "should return 400 when the provided documentId does not exist",
      { tags: ["createActivity"] },
      async () => {
        const nonExistingDocumentId = generateUUID().toString();

        const body = getValidActivityParams(nonExistingDocumentId);

        const response = await request(app.getHttpServer())
          .put("/v1/pts/activity/create")
          .set({ authorization: `Bearer ${professionalAccountToken}` })
          .send(body)
          .expect(400);

        expect(response.body).toHaveProperty("message");
      },
    );

    it("should create a new activity successfully", { tags: ["createActivity"] }, async () => {
      const mockDocument = await documentsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
      });

      const body = getValidActivityParams(mockDocument.getId().toString());

      await request(app.getHttpServer())
        .put("/v1/pts/activity/create")
        .set({ authorization: `Bearer ${professionalAccountToken}` })
        .send(body)
        .expect(201);

      const persistedActivity = await prisma.activity.findFirstOrThrow({
        where: { title: "Caminhada Assistida e Mobilidade" },
        include: { activityReferringToDocuments: true },
      });

      expect(persistedActivity).toBeDefined();
      expect(persistedActivity.activityReferringToDocuments).toHaveLength(1);
      expect(persistedActivity.activityReferringToDocuments[0].documentId).toBe(
        mockDocument.getId().toString()
      );
    });
  });
});
