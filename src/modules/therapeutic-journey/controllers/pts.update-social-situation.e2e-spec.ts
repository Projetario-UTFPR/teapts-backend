import { UUID } from "@/common/uuid";
import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { HttpStatus, type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import request from "supertest";
import type { App } from "supertest/types";

describe("[e2e] PTS Controller :: Update Social Situation (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;

  let patient: Patient;
  let ptsId: UUID;
  let accessToken: string;

  const ENDPOINT = () => `/v1/pts/${patient.getId().toString()}/social-situation/update`;

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    const professionalAccount = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678" },
      { hasher },
    );

    const professional = await professionalsFactory.createAndPersist(prisma, {
      account: professionalAccount,
    });

    patient = await patientsFactory.createAndPersist(prisma);

    const accessTokenResult = await tokensService.execute({ account: professionalAccount });
    if (e.isLeft(accessTokenResult)) {
      throw new Error("Didn't issued an access token correctly for the test.");
    }

    accessToken = accessTokenResult.right.accessToken;

    const pts = await ptsFactory.createAndPersist(prisma, {
      patientId: patient.getId(),
      responsibleProfessionalId: professional.getId(),
      timeline: ptsFactory.createTimeline({
        status: PtsTimeline.Status.Running,
        acceptedAt: new Date(),
        beganAt: new Date(),
      }),
    });

    ptsId = pts.getId();
  });

  test("update social situation route requires authentication", async () => {
    await request(app.getHttpServer()).patch(ENDPOINT()).send({ socialSituation: "" }).expect(401);
  });

  it("should require social situation in the body", async () => {
    const response = await request(app.getHttpServer())
      .patch(ENDPOINT())
      .set("Authorization", `Bearer ${accessToken}`)
      .send({})
      .expect(422);

    expect(response.body["errors"]).toBeDefined();
    expect(response.body["errors"]["socialSituation"].length).toBe(1);
  });

  it("should be considering the authenticated user as the professional trying to modify the PTS", async () => {
    const unauthorizedYetProfessionalAccount = await accountsFactory.createAndPersist(prisma);
    await professionalsFactory.createAndPersist(prisma, {
      account: unauthorizedYetProfessionalAccount,
    });

    const tokens = await tokensService.execute({ account: unauthorizedYetProfessionalAccount });
    assert(e.isRight(tokens));

    await request(app.getHttpServer())
      .patch(ENDPOINT())
      .set("Authorization", `Bearer ${tokens.right.accessToken}`)
      .send({ socialSituation: "validBody" })
      .expect(403);
  });

  it("should update the social situation", async () => {
    await prisma.projetoTerapeuticoSingular.updateMany({
      where: { id: ptsId.toString() },
      data: { socialSituation: "original social situation" },
    });

    const EDITED_SOCIAL_SITUATION = "new social situation text";
    await request(app.getHttpServer())
      .patch(ENDPOINT())
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ socialSituation: EDITED_SOCIAL_SITUATION })
      .expect(HttpStatus.NO_CONTENT);

    const ptsFromDb = await prisma.projetoTerapeuticoSingular.findUniqueOrThrow({
      where: { id: ptsId.toString() },
    });

    expect(ptsFromDb.socialSituation).toBe(EDITED_SOCIAL_SITUATION);
  });
});
