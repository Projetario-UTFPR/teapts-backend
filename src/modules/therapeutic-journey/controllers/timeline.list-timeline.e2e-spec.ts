import ptsFactory from "@test/factories/pts.factory";
import { TimelineRecord } from "../aggregates/timeline-record.aggregate";
import { PtsTimeline } from "../value-objects/pts-timeline.vo";
import patientsFactory from "@test/factories/patients.factory";
import accountsFactory from "@test/factories/accounts.factory";
import professionalsFactory from "@test/factories/professionals.factory";
import { AssignTokenService } from "@/infra/auth/services/assign-token.service";
import { Hasher } from "@/modules/crypto/hasher";
import { PrismaService } from "@/infra/prisma/prisma";
import { getTestingApp } from "@test/get-testing-app";
import { Patient } from "@/modules/patient/aggregates/patient.aggregate";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { INestApplication } from "@nestjs/common";
import { App } from "supertest/types";
import { either as e } from "fp-ts";
import request from "supertest";
import timelineRecordFactory from "@test/factories/timeline-record.factory";

describe("[e2e] Timeline Controller :: List Timeline Records (v1)", () => {
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

  const _getEndpoint = (id: string, query = "") => `/v1/pts/${id}/timeline${query}`;
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

  const seedTimelineRecords = async (ptsId: string, count: number, overrides = {}) => {
    const promises = Array.from({ length: count }).map((_, index) =>
      timelineRecordFactory.createAndPersist(prisma, {
        description: `Evento de Teste ${index + 1}`,
        ptsId,
        responsibleProfessionalId: professional.getId(),
        target: TimelineRecord.TargetType.Pts,
        type: TimelineRecord.Type.Created,
        ...overrides,
      }),
    );

    await Promise.all(promises);
  };

  it(
    "should require authentication to list timeline records",
    { tags: ["listTimeline"] },
    async () => {
      await request(app.getHttpServer()).get(getEndpoint()).expect(401);
    },
  );

  it(
    "should block a professional from listing the timeline if they don't belong to the PTS",
    { tags: ["listTimeline"] },
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
    "should block a patient from listing the timeline of another patient's PTS",
    { tags: ["listTimeline"] },
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
    "should allow a patient to list timeline records from their own PTS",
    { tags: ["listTimeline"] },
    async () => {
      const pts = await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
      });

      await seedTimelineRecords(pts.getId().toString(), 2);

      const response = await request(app.getHttpServer())
        .get(getEndpoint())
        .set({ authorization: `Bearer ${patientToken}` })
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body.items).toHaveLength(2);
      expect(response.body.totalElements).toBe(2);
    },
  );

  it(
    "should allow an authorized professional to list records and paginate them correctly",
    { tags: ["listTimeline"] },
    async () => {
      const pts = await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
        responsibleProfessionalId: professional.getId(),
      });

      await seedTimelineRecords(pts.getId().toString(), 5);

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

  it(
    "should correctly filter timeline records by target, type, and professionalId",
    { tags: ["listTimeline"] },
    async () => {
      const pts = await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
        responsibleProfessionalId: professional.getId(),
      });

      await seedTimelineRecords(pts.getId().toString(), 3);

      await seedTimelineRecords(pts.getId().toString(), 2, {
        target: TimelineRecord.TargetType.Activity,
        type: TimelineRecord.Type.Approved,
        responsibleProfessionalId: professional.getId(),
      });

      const query = `?target=${TimelineRecord.TargetType.Activity}&type=${TimelineRecord.Type.Approved}&professionalId=${professional.getId()}`;

      const response = await request(app.getHttpServer())
        .get(getEndpoint(query))
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.totalElements).toBe(2);
      expect(response.body.items[0].target).toBe(TimelineRecord.TargetType.Activity);
      expect(response.body.items[0].type).toBe(TimelineRecord.Type.Approved);
    },
  );

  it(
    "should correctly filter timeline records by various combinations of criteria",
    { tags: ["listTimeline"] },
    async () => {
      const pts = await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
        responsibleProfessionalId: professional.getId(),
      });

      const otherProfAccount = await accountsFactory.createAndPersist(
        prisma,
        { plainPassword: "Oth3rPassword" },
        { hasher },
      );
      const otherProfessional = await professionalsFactory.createAndPersist(prisma, {
        account: otherProfAccount,
      });

      await seedTimelineRecords(pts.getId().toString(), 1, {
        target: TimelineRecord.TargetType.Pts,
        type: TimelineRecord.Type.Created,
        responsibleProfessionalId: professional.getId(),
      });

      await seedTimelineRecords(pts.getId().toString(), 1, {
        target: TimelineRecord.TargetType.Activity,
        type: TimelineRecord.Type.Created,
        responsibleProfessionalId: professional.getId(),
      });

      await seedTimelineRecords(pts.getId().toString(), 1, {
        target: TimelineRecord.TargetType.Activity,
        type: TimelineRecord.Type.Approved,
        responsibleProfessionalId: otherProfessional.getId(),
      });

      const resTarget = await request(app.getHttpServer())
        .get(getEndpoint(`?target=${TimelineRecord.TargetType.Activity}`))
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(200);

      expect(resTarget.body.items).toHaveLength(2);
      expect(resTarget.body.totalElements).toBe(2);
      expect(
        resTarget.body.items.every((i) => i.target === TimelineRecord.TargetType.Activity),
      ).toBe(true);

      const resType = await request(app.getHttpServer())
        .get(getEndpoint(`?type=${TimelineRecord.Type.Approved}`))
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(200);

      expect(resType.body.items).toHaveLength(1);
      expect(resType.body.items[0].type).toBe(TimelineRecord.Type.Approved);

      const resProf = await request(app.getHttpServer())
        .get(getEndpoint(`?professionalId=${professional.getId()}`))
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(200);

      expect(resProf.body.items).toHaveLength(2);

      const queryCombined = `?target=${TimelineRecord.TargetType.Activity}&type=${TimelineRecord.Type.Approved}&professionalId=${otherProfessional.getId()}`;
      const resCombined = await request(app.getHttpServer())
        .get(getEndpoint(queryCombined))
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(200);

      expect(resCombined.body.items).toHaveLength(1);
      expect(resCombined.body.items[0].target).toBe(TimelineRecord.TargetType.Activity);
      expect(resCombined.body.items[0].type).toBe(TimelineRecord.Type.Approved);

      const queryEmpty = `?target=${TimelineRecord.TargetType.Pts}&type=${TimelineRecord.Type.Approved}`;
      const resEmpty = await request(app.getHttpServer())
        .get(getEndpoint(queryEmpty))
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(200);

      expect(resEmpty.body.items).toHaveLength(0);
      expect(resEmpty.body.totalElements).toBe(0);
    },
  );

  it(
    "should correctly filter timeline records by a partial description",
    { tags: ["listTimeline"] },
    async () => {
      const pts = await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
        responsibleProfessionalId: professional.getId(),
      });

      await seedTimelineRecords(pts.getId().toString(), 2);

      const targetDescription = "Avaliação fisioterapêutica inicial com foco na lombar";
      await seedTimelineRecords(pts.getId().toString(), 1, {
        description: targetDescription,
      });

      const query = `?description=fisioterapêutica`;

      const response = await request(app.getHttpServer())
        .get(getEndpoint(query))
        .set({ authorization: `Bearer ${professionalToken}` })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.totalElements).toBe(1);
      expect(response.body.items[0].description).toBe(targetDescription);
    },
  );

  it(
    "should correctly filter timeline records within a specific date range",
    { tags: ["listTimeline"] },
    async () => {
      const pts = await ptsFactory.createAndPersist(prisma, {
        patientId: patient.getId(),
        timeline: ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
        responsibleProfessionalId: professional.getId(),
      });

      await seedTimelineRecords(pts.getId().toString(), 1, {
        description: "Registro do início do ano",
        happenedAt: new Date("2026-01-10T10:00:00.000Z"),
      });

      await seedTimelineRecords(pts.getId().toString(), 1, {
        description: "Registro alvo do meio do ano",
        happenedAt: new Date("2026-06-15T14:30:00.000Z"),
      });

      await seedTimelineRecords(pts.getId().toString(), 1, {
        description: "Registro do fim do ano",
        happenedAt: new Date("2026-12-25T09:00:00.000Z"),
      });

      const query = "?startDate=2026-06-01T00:00:00.000Z&endDate=2026-06-30T23:59:59.999Z";

      const response = await request(app.getHttpServer())
        .get(getEndpoint(query))
        .set({ authorization: `Bearer ${patientToken}` })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.totalElements).toBe(1);
      expect(response.body.items[0].description).toBe("Registro alvo do meio do ano");
    },
  );
});
