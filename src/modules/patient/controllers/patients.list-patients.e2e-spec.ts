import { AssignTokenService } from "@/infra/auth/services/assign-token.service";
import { PrismaService } from "@/infra/prisma/prisma";
import { Hasher } from "@/modules/crypto/hasher";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { PaginatedPatientsPresenter } from "@/modules/patient/presenters/paginated-patients.presenter";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { type INestApplication } from "@nestjs/common";
import accountsFactory from "@test/factories/accounts.factory";
import patientsFactory from "@test/factories/patients.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e } from "fp-ts";
import supertest from "supertest";
import { type App } from "supertest/types";

describe("[e2e] Patients Controller :: List Patients (v1)", async () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;

  let professionalAccount: Account;
  let professionalProfiles: Professional[] = [];
  let accessToken: string;

  const ENDPOINT = "/v1/patients";

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    professionalProfiles = [];
    professionalAccount = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678" },
      { hasher },
    );

    for (let i = 0; i < 3; i++) {
      const professionalProfile = await professionalsFactory.createAndPersist(prisma, {
        account: professionalAccount,
      });

      professionalProfiles.push(professionalProfile);
    }

    const account = professionalAccount;
    const tokens = await tokensService.execute({ account });

    if (e.isLeft(tokens)) {
      throw new Error("Could not proceed with tests due to failure on getting an access token.");
    }

    accessToken = tokens.right.accessToken;
  });

  it("should return forbid if the authenticated account has no professional profiles", async () => {
    const rawAccount = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "12345678" },
      { hasher },
    );

    const tokens = await tokensService.execute({ account: rawAccount });
    assert(e.isRight(tokens));

    await supertest(app.getHttpServer())
      .get(ENDPOINT)
      .set("authorization", `Bearer ${tokens.right.accessToken}`)
      .expect(403);
  });

  it("should list patients who have at least one active PTS (even if they have inactive ones)", async () => {
    const patient = await patientsFactory.createAndPersist(prisma);

    await ptsFactory.createAndPersist(prisma, {
      patientId: patient.getId().toString(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Concluded }),
    });

    await ptsFactory.createAndPersist(prisma, {
      patientId: patient.getId().toString(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
    });

    const response = await supertest(app.getHttpServer())
      .get(`${ENDPOINT}?withActivePts=true`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as PaginatedPatientsPresenter;
    expect(body.totalElements).toBe(1);
    expect(body.items[0].accountId).toBe(patient.getId().toString());
  });

  it("should not list patients who have no active PTS", async () => {
    const patient = await patientsFactory.createAndPersist(prisma);

    await ptsFactory.createAndPersist(prisma, {
      patientId: patient.getId().toString(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Cancelled }),
    });

    const response = await supertest(app.getHttpServer())
      .get(`${ENDPOINT}?withActivePts=true`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as PaginatedPatientsPresenter;
    expect(body.totalElements).toBe(0);
  });

  it("should only list patients who has no active PTS", async () => {
    const patientWithActivePts = await patientsFactory.createAndPersist(prisma);
    const patientWithoutActivePts = await patientsFactory.createAndPersist(prisma);
    const patientWithNoPts = await patientsFactory.createAndPersist(prisma);

    await ptsFactory.createAndPersist(prisma, {
      patientId: patientWithoutActivePts.getId().toString(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Cancelled }),
    });

    await ptsFactory.createAndPersist(prisma, {
      patientId: patientWithActivePts.getId().toString(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Cancelled }),
    });

    await ptsFactory.createAndPersist(prisma, {
      patientId: patientWithActivePts.getId().toString(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Concluded }),
    });

    const response = await supertest(app.getHttpServer())
      .get(`${ENDPOINT}?withActivePts=false`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as PaginatedPatientsPresenter;
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: patientWithNoPts.getId().toString() }),
        expect.objectContaining({ accountId: patientWithActivePts.getId().toString() }),
      ]),
    );
  });

  it("should list patients if there is any relationship, regardless of PTS status", async () => {
    const profile = professionalProfiles[0];
    const patient = await patientsFactory.createAndPersist(prisma);

    await ptsFactory.createAndPersist(prisma, {
      patientId: patient.getId().toString(),
      responsibleProfessionalId: profile.getId().toString(),
      timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Concluded }),
    });

    const response = await supertest(app.getHttpServer())
      .get(`${ENDPOINT}`)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as PaginatedPatientsPresenter;
    expect(body.totalElements).toBe(1);
  });
});
