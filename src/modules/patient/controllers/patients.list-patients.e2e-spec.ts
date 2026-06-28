import { UUID } from "@/common/uuid";
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

  const ENDPOINT = "/v1/patients/me";

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

  const generatePatients = async (
    count: number,
    responsibleProfessionalId: UUID | undefined,
    teamProfessionalId: UUID | undefined,
  ) => {
    for (let i = 0; i < count; i++) {
      const patient = await patientsFactory.createAndPersist(prisma);
      await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId().toString(),
        responsibleProfessionalId,
        multidisciplinaryTeamIds: teamProfessionalId ? [teamProfessionalId] : [],
        timeline: ptsFactory.createTimeline({
          acceptedAt: new Date(),
          status: PtsTimeline.Status.Planning,
        }),
      });
    }
  };

  it.each(["responsible", "member"] as const)(
    "should list patients of a professional only when it has a $0 relationship with the patient's active PTS",
    async (situation) => {
      for (const profile of professionalProfiles) {
        if (situation === "member") {
          await generatePatients(5, undefined, profile.getId());
          continue;
        }

        await generatePatients(5, profile.getId(), undefined);
      }

      const otherProfessionalAccount = await accountsFactory.createAndPersist(prisma);
      const otherProfessional = await professionalsFactory.createAndPersist(prisma, {
        account: otherProfessionalAccount,
      });

      // it should not count these pts as they does not belong to authenticated professional
      for (let i = 0; i < 10; i++) {
        const patient = await patientsFactory.createAndPersist(prisma);
        await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId().toString(),
          responsibleProfessionalId: otherProfessional.getId().toString(),
          timeline: ptsFactory.createTimeline({
            acceptedAt: new Date(),
            status: PtsTimeline.Status.Planning,
          }),
        });
      }

      const response = await supertest(app.getHttpServer())
        .get(`${ENDPOINT}?limit=100`)
        .set("authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PaginatedPatientsPresenter;

      expect(body.items.length).toBe(15);
      expect(body.totalElements).toBe(15);
    },
  );

  it(
    "should not list patient's whose PTS are no longer active, even if they have " +
      "something to do with the professional",
    async () => {
      const profile = professionalProfiles[0];
      const activeStatuses = [PtsTimeline.Status.Planning, PtsTimeline.Status.Running];
      const nonActiveStatuses = Object.values(PtsTimeline.Status).filter(
        (status) => !activeStatuses.includes(status as PtsTimeline.Status),
      );

      for (const status of nonActiveStatuses) {
        const patient = await patientsFactory.createAndPersist(prisma);
        await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId().toString(),
          responsibleProfessionalId: profile.getId().toString(),
          timeline: ptsFactory.createTimeline({ status }),
        });
      }

      const response = await supertest(app.getHttpServer())
        .get(ENDPOINT)
        .set("authorization", `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PaginatedPatientsPresenter;
      expect(body.items.length).toBe(0);
      expect(body.totalElements).toBe(0);
    },
  );

  it("should order by account creation timestamp by default (latests first)", async () => {
    const profile = professionalProfiles[0];
    const firstPatient = await patientsFactory.createAndPersist(prisma);

    // we need to force this to have a different creation timestamp to ensure the test works deterministically
    const secondPatientAccount = await accountsFactory.createAndPersist(prisma, {
      createdAt: new Date(new Date().getDate() + 10), // forces it to be second when ordering by creation timestamp
    });

    const secondPatient = await patientsFactory.createAndPersist(prisma, {
      accountId: secondPatientAccount.getId(),
    });

    for (const patient of [firstPatient, secondPatient]) {
      await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId().toString(),
        responsibleProfessionalId: profile.getId().toString(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
      });
    }

    const response = await supertest(app.getHttpServer())
      .get(ENDPOINT)
      .set("authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as PaginatedPatientsPresenter;

    expect(body).toEqual(
      expect.objectContaining({
        page: 1,
        perPage: expect.any(Number),
        totalElements: 2,
        items: expect.arrayContaining([
          expect.objectContaining({
            accountId: secondPatient.getId().toString(),
            createdAt: expect.any(String),
            email: expect.any(String),
            name: expect.any(String),
            supportContacts: expect.arrayContaining([]),
          }),
          expect.objectContaining({ accountId: secondPatient.getId().toString() }),
        ]),
      } satisfies PaginatedPatientsPresenter),
    );

    // newest comes first
    expect(body.items[0].accountId).toBe(secondPatient.getId());
    expect(body.items[1].accountId).toBe(firstPatient.getId());
  });
});
