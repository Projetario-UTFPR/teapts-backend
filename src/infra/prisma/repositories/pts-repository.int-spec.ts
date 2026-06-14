import type { INestApplication } from "@nestjs/common";
import { App } from "supertest/types";
import patientsFactory from "@test/factories/patients.factory";
import { Patient } from "@/modules/patient/entities/patient.entity";
import { PrismaService } from "@/infra/prisma/prisma";
import ptsFactory from "@test/factories/pts.factory";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { PrismaPtsRepository } from "@/infra/prisma/repositories/pts.repository";
import { either } from "fp-ts";
import { getTestingApp } from "@test/get-testing-app";

describe("[Integration] Prisma PTS Repository", () => {
  let prisma: PrismaService;
  let patient: Patient;

  // repository under test
  let rut: PrismaPtsRepository;

  beforeAll(async () => {
    let app: INestApplication<App> = await getTestingApp({ extraProviders: [PrismaPtsRepository] });

    prisma = app.get(PrismaService);
    rut = app.get(PrismaPtsRepository);

    await app.init();
  });

  beforeEach(async () => {
    patient = await patientsFactory.createAndPersist(prisma);
  });

  it.each([
    ptsFactory.createTimeline({ status: PtsTimeline.Status.Planning }),
    ptsFactory.createTimeline({ status: PtsTimeline.Status.Running }),
  ])(
    "should return truthy when there is a PTS in in active ($status) state",
    { tags: ["activePtsExistsByPatientId"] },
    async (timeline) => {
      await ptsFactory.createAndPersist(prisma, { timeline, patientId: patient.getId() });
      const result = await rut.activePtsExistsByPatientId(patient.getId());

      assert(either.isRight(result), "it should have counted successfully");

      expect(result.right, "it should have accused there is an active PTS for given patient").toBe(
        true,
      );
    },
  );

  it.each([
    ptsFactory.createTimeline({ status: PtsTimeline.Status.Cancelled, cancelledAt: new Date() }),
    ptsFactory.createTimeline({ status: PtsTimeline.Status.Concluded, concludedAt: new Date() }),
    ptsFactory.createTimeline({ status: PtsTimeline.Status.Draft, createdAt: new Date() }),
    ptsFactory.createTimeline({ status: PtsTimeline.Status.Rejected, rejectedAt: new Date() }),
  ])(
    "should return falsy if there is one PTS but with the non-active $status state",
    { tags: ["activePtsExistsByPatientId"] },
    async (timeline) => {
      await ptsFactory.createAndPersist(prisma, { timeline, patientId: patient.getId() });

      const result = await rut.activePtsExistsByPatientId(patient.getId());

      assert(either.isRight(result), "it should have counted successfully");
      expect(result.right).toBe(false);
    },
  );

  it(
    "should return falsy if there are many PTSs but with any non-active ($status) state",
    { tags: ["activePtsExistsByPatientId"] },
    async () => {
      const nonActiveStates = [
        ptsFactory.createTimeline({
          status: PtsTimeline.Status.Cancelled,
          cancelledAt: new Date(),
        }),
        ptsFactory.createTimeline({
          status: PtsTimeline.Status.Concluded,
          concludedAt: new Date(),
        }),
        ptsFactory.createTimeline({ status: PtsTimeline.Status.Draft, createdAt: new Date() }),
        ptsFactory.createTimeline({
          status: PtsTimeline.Status.Rejected,
          rejectedAt: new Date(),
        }),
      ];

      for (const timeline of nonActiveStates) {
        await ptsFactory.createAndPersist(prisma, { timeline, patientId: patient.getId() });
      }

      const result = await rut.activePtsExistsByPatientId(patient.getId());

      assert(either.isRight(result), "it should have counted successfully");
      expect(result.right).toBe(false);
    },
  );
});
