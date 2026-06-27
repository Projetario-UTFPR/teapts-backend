import { generateUUID } from "@/common/uuid";
import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import request from "supertest";
import type { App } from "supertest/types";

describe("[e2e] PTS Controller :: Update Multidisciplinary Team (v1)", () => {
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

  const assertIsValidationErrorsBag = (response: request.Response) => {
    expect(response.body, "response should be a validation bag object").toHaveProperty("errors");
  };

  test("update multidisciplinary team route requires authentication", async () => {
    await request(app.getHttpServer())
      .put("/v1/pts/update/multidisciplinary-team")
      .send({
        ptsId: generateUUID().toString(),
        professionalId: professional.getId().toString(),
        multidisciplinaryTeamIds: [],
      })
      .expect(401);
  });

  it.each([
    [{ ptsId: undefined }, "ptsId"] as const,
    [{ professionalId: undefined }, "professionalId"] as const,
    [{ multidisciplinaryTeamIds: undefined }, "multidisciplinaryTeamIds"] as const,
  ])("should return 422 when `$1` is missing", async (override, missingProperty) => {
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
  });

  it("should return 404 when the PTS does not exist", async () => {
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

  it("should return 403 when the professional is not the responsible for the PTS", async () => {
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
  });

  it("should return 400 when a new team member is not a registered professional", async () => {
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
  });

  it("should update the multidisciplinary team applying WatchedList behavior (add new, remove omitted, keep untouched)", async () => {
    const responsible = professional;
    const memberToKeep = await professionalsFactory.createAndPersist(prisma, { account });
    const memberToRemove = await professionalsFactory.createAndPersist(prisma, { account });

    const pts = await ptsFactory.createAndPersist(prisma, {
      patientId: patient.getId(),
      responsibleProfessionalId: responsible.getId(),
      multidisciplinaryTeamIds: [responsible.getId(), memberToKeep.getId(), memberToRemove.getId()],
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
  });

  it("should return 400 when the responsible tries to remove themselves without providing a substitute", async () => {
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
  });
});
