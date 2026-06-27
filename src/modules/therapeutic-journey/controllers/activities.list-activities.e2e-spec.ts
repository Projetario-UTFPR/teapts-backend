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
import { PtsTimeline } from "../value-objects/pts-timeline.vo";
import { Activity } from "../aggregates/activity.aggregate";
import activityFactory from "@test/factories/activity.factory";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";

describe("[e2e] PTS Activities Controller :: List Activities (v1)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hasher: Hasher;
  let tokensService: AssignTokenService;

  let professionalAccount: Account;
  let professional: Professional;
  let professionalToken: string;

  let patientAccount: Account;
  let patient: Patient;
  let patientToken: string;

  const _getEndpoint = (id: string, query = "") => `/v1/pts/${id}/activity${query}`;
  const getEndpoint = (query = "") => _getEndpoint(patient.getId().toString(), query);

  beforeAll(async () => {
    app = await getTestingApp();

    prisma = app.get(PrismaService);
    hasher = app.get(Hasher);
    tokensService = app.get(AssignTokenService);

    await app.init();
  });

  beforeEach(async () => {
    professionalAccount = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "D0utorHous3" },
      { hasher },
    );

    professional = await professionalsFactory.createAndPersist(prisma, {
      account: professionalAccount,
    });

    const profTokenResult = await tokensService.execute({ account: professionalAccount });
    if (e.isLeft(profTokenResult)) throw new Error("Failed to issue professional token.");
    professionalToken = profTokenResult.right.accessToken;

    patientAccount = await accountsFactory.createAndPersist(
      prisma,
      { plainPassword: "Gh4nd1" },
      { hasher },
    );

    patient = await patientsFactory.createAndPersist(prisma, {
      accountId: patientAccount.getId(),
    });

    const patTokenResult = await tokensService.execute({ account: patientAccount });
    if (e.isLeft(patTokenResult)) throw new Error("Failed to issue patient token.");

    patientToken = patTokenResult.right.accessToken;
  });

  const seedActivities = async (pts: ProjetoTerapeuticoSingular, count: number) => {
    const promises = Array.from({ length: count }).map((_, index) =>
      activityFactory.createAndPersist(prisma, {
        title: `Atividade de Teste ${index + 1}`,
        pts,
        assigneeProfessionalId: professional.getId(),
        state: Activity.State.Suggested,
      }),
    );

    await Promise.all(promises);
  };

  it("should require authentication to list activities", { tags: ["listActivities"] }, async () => {
    await request(app.getHttpServer()).get(getEndpoint()).expect(401);
  });

  it(
    "should block a professional from listing activities if they don't belong to the PTS",
    { tags: ["listActivities"] },
    async () => {
      await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
      });

      const response = await request(app.getHttpServer())
        .get(getEndpoint())
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(403);

      expect(response.body).toHaveProperty("message");
    },
  );

  it(
    "should block a patient from listing activities of another patient's PTS",
    { tags: ["listActivities"] },
    async () => {
      const otherPatient = await patientsFactory.createAndPersist(prisma);
      await ptsFactory.createAndPersist(prisma, {
        patientId: otherPatient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
      });

      const response = await request(app.getHttpServer())
        .get(_getEndpoint(otherPatient.getId().toString()))
        .set({ authorization: `Bearer ${patientToken}` })
        .expect(403);

      expect(response.body).toHaveProperty("message");
    },
  );

  it(
    "should allow a patient to list activities from their own PTS",
    { tags: ["listActivities"] },
    async () => {
      const pts = await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
      });

      await seedActivities(pts, 2);

      const response = await request(app.getHttpServer())
        .get(getEndpoint())
        .set({ authorization: `Bearer ${patientToken}` });

      expect(response.body).toHaveProperty("items");
      expect(response.body.items).toHaveLength(2);
      expect(response.body.totalElements).toBe(2);
    },
  );

  it(
    "should allow an authorized professional to list activities and paginate them correctly",
    { tags: ["listActivities"] },
    async () => {
      const pts = await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
        responsibleProfessionalId: professional.getId(),
      });

      await seedActivities(pts, 5);

      const responsePage1 = await request(app.getHttpServer())
        .get(getEndpoint("?page=1&limit=3"))
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(200);

      expect(responsePage1.body.items).toHaveLength(3);
      expect(responsePage1.body.totalElements).toBe(5);
      expect(responsePage1.body.page).toBe(1);
      expect(responsePage1.body.perPage).toBe(3);

      const responsePage2 = await request(app.getHttpServer())
        .get(getEndpoint("?page=2&limit=3"))
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(200);

      expect(responsePage2.body.items).toHaveLength(2);
      expect(responsePage2.body.totalElements).toBe(5);
      expect(responsePage2.body.page).toBe(2);
    },
  );
});
