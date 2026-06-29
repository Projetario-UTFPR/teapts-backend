import { AssignTokenService } from "@/infra/auth/services/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { INestApplication } from "@nestjs/common";
import { PtsStatus } from "@prisma-gen/enums";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either } from "fp-ts";
import supertest from "supertest";
import { App } from "supertest/types";

describe("[e2e] PTS Controller :: Show PTS (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;

  type AuthorizedProfessionals = {
    responsible: {
      account?: Account;
      profile?: Professional;
    };
    member: {
      account?: Account;
      profile?: Professional;
    };
  };

  let authorizedProfessionals: AuthorizedProfessionals = { member: {}, responsible: {} };

  let patientAccount: Account;
  let patient: Patient;

  let pts: ProjetoTerapeuticoSingular;

  const getEndpoint = () => `/v1/pts/${patient.getId().toString()}`;

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    authorizedProfessionals.responsible.account = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678" },
      { hasher },
    );

    authorizedProfessionals.responsible.profile = await professionalsFactory.createAndPersist(
      prisma,
      {
        account: authorizedProfessionals.responsible.account,
      },
    );

    authorizedProfessionals.member.account = await accountsFactory.createAndPersist(prisma);
    authorizedProfessionals.member.profile = await professionalsFactory.createAndPersist(prisma, {
      account: authorizedProfessionals.member.account,
    });

    patientAccount = await accountsFactory.createAndPersist(prisma);
    patient = await patientsFactory.createAndPersist(prisma, { accountId: patientAccount.getId() });

    pts = await ptsFactory.createAndPersist(prisma, {
      patientId: patient.getId(),
      responsibleProfessionalId: authorizedProfessionals.responsible.profile!.getId(),
      multidisciplinaryTeamIds: [authorizedProfessionals.member.profile!.getId()],
      timeline: ptsFactory.createTimeline({
        status: PtsTimeline.Status.Running,
        acceptedAt: new Date(),
        beganAt: new Date(),
      }),
    });
  });

  it("should not accept unauthorized requests", async () => {
    await supertest(app.getHttpServer()).get(getEndpoint()).expect(401);
  });

  it("should not let a non-member professional of the PTS access its details", async () => {
    const nonMemberAccount = await accountsFactory.createAndPersist(prisma);
    const _nonMemberProfessionalProfile = await professionalsFactory.createAndPersist(prisma, {
      account: nonMemberAccount,
    });

    const accessTokenResult = await tokensService.execute({
      account: nonMemberAccount,
    });
    assert(either.isRight(accessTokenResult));

    await supertest(app.getHttpServer())
      .get(getEndpoint())
      .set("Authorization", `Bearer ${accessTokenResult.right.accessToken}`)
      .expect(403);
  });

  it.each(["responsible", "member"] as const)(
    "should let a $0 professional access details of the PTS",
    async (profile) => {
      assert(authorizedProfessionals[profile].account);
      const accessTokenResult = await tokensService.execute({
        account: authorizedProfessionals[profile].account,
      });
      assert(either.isRight(accessTokenResult));

      const response = await supertest(app.getHttpServer())
        .get(getEndpoint())
        .set("Authorization", `Bearer ${accessTokenResult.right.accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          patient: expect.objectContaining({ supportContacts: expect.arrayContaining([]) }),
          responsibleProfessional: expect.objectContaining({
            accountId: expect.any(String),
            createdAt: expect.any(String),
            email: expect.any(String),
            name: expect.any(String),
            professionalId: expect.any(String),
            specialism: expect.any(String),
          }),
          multidisciplinaryTeamIds: expect.arrayContaining(
            pts.getMultidisciplinaryTeam().getCurrent(),
          ),
          socialSituation: expect.any(String),
          status: expect.toBeOneOf(Object.values(PtsTimeline.Status)),
          createdAt: expect.any(String),
          acceptedAt: expect.toBeOneOf([expect.any(String), undefined]),
          beganAt: expect.toBeOneOf([expect.any(String), undefined]),
        }),
      );
    },
  );

  it("should let the patient access its PTS partially", async () => {
    const accessTokenResult = await tokensService.execute({ account: patientAccount });
    assert(either.isRight(accessTokenResult));

    const response = await supertest(app.getHttpServer())
      .get(getEndpoint())
      .set("Authorization", `Bearer ${accessTokenResult.right.accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      id: expect.any(String),
      patient: expect.objectContaining({ supportContacts: expect.arrayContaining([]) }),
      responsibleProfessional: expect.objectContaining({
        accountId: expect.any(String),
        createdAt: expect.any(String),
        email: expect.any(String),
        name: expect.any(String),
        professionalId: expect.any(String),
        specialism: expect.any(String),
      }),
      multidisciplinaryTeamIds: expect.arrayContaining(pts.getMultidisciplinaryTeam().getCurrent()),
      status: expect.toBeOneOf(Object.values(PtsTimeline.Status)),
      createdAt: expect.any(String),
      acceptedAt: expect.toBeOneOf([expect.any(String), undefined]),
      beganAt: expect.toBeOneOf([expect.any(String), undefined]),
    });

    expect(
      response.body.socialSituation,
      "it should not let patient see its social situation",
    ).toBeUndefined();
  });

  it.each(
    Object.values(PtsStatus).filter(
      (status) => !(["Planning", "Running"] as PtsStatus[]).includes(status),
    ),
  )("should not display details of a PTS that ain't active", async (status) => {
    const accessTokenResult = await tokensService.execute({
      account: authorizedProfessionals.responsible.account!,
    });
    assert(either.isRight(accessTokenResult));

    await prisma.projetoTerapeuticoSingular.updateMany({
      data: { status },
    });

    await supertest(app.getHttpServer())
      .get(getEndpoint())
      .set("Authorization", `Bearer ${accessTokenResult.right.accessToken}`)
      .expect(403);
  });

  it.each(["Cancelled", "Concluded", "Draft", "Rejected"] as PtsStatus[])(
    "should respond with not found when patient has no active PTS but wants to see his own active PTS",
    async (nonActiveStatus) => {
      const accessTokenResult = await tokensService.execute({
        // note: it's the PATIENT itself trying to see his own active (and unexisting) PTS
        account: patientAccount,
      });
      assert(either.isRight(accessTokenResult));

      await prisma.projetoTerapeuticoSingular.update({
        where: { id: pts.getId().toString() },
        data: { status: nonActiveStatus },
      });

      await supertest(app.getHttpServer())
        .get(getEndpoint())
        .set("Authorization", `Bearer ${accessTokenResult.right.accessToken}`)
        .expect(404);
    },
  );
});
