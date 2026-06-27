import { Patient } from "@/modules/patient/entities/patient.entity";
import { either } from "fp-ts";
import { BaseError } from "@/common/errors/base.error";
import { TransactionManager } from "@/common/transaction-manager";
import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { PtsStatus } from "@prisma-gen/enums";
import patientsFactory from "@test/factories/patients.factory";
import ptsFactory from "@test/factories/pts.factory";
import { getTestingApp } from "@test/get-testing-app";
import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

describe("[Integration] Prisma PTS Repository", () => {
  let patient: Patient;
  let prisma: PrismaService;
  // repository under test(s|ing)
  let rut: PtsRepository;
  let txManager: TransactionManager;

  beforeAll(async () => {
    const app = await getTestingApp();
    prisma = app.get(PrismaService);
    rut = app.get(PtsRepository);
    txManager = app.get(TransactionManager);
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

  // testing the others have been rejected (keeping timeline integrity) is business of pts repo integration test
  it(
    "should add the rejection timestamp upon batch rejection of draft PTSs",
    { tags: ["rejectEveryProposalByPatientId"] },
    async () => {
      const patient = await patientsFactory.createAndPersist(prisma);

      for (let i = 0; i < 5; i++) {
        // draft pts
        await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          timeline: PtsTimeline.create(),
        });
      }

      await expect(rut.rejectEveryProposalByPatientId(patient.getId())).resolves.not.toThrow();

      const rows = await prisma.projetoTerapeuticoSingular.findMany({
        where: { patientId: patient.getId().toString() },
      });

      expect(
        rows.every((row) => row.status === "Rejected"),
        "it should have rejected every PTS",
      ).toBe(true);

      expect(
        rows.every((row) => row.rejectedAt !== null),
        "it should have set rejection timestamp on every rejected PTS",
      );
    },
  );

  // doing this to keep integrity during this test: patients must have only one active PTS at once
  it.each(["Running", "Planning"] as const satisfies PtsStatus[])(
    "should not reject non-draft PTSs (running with active status $0)",
    { tags: ["rejectEveryProposalByPatientId"] },
    async (activeStatus) => {
      const patient = await patientsFactory.createAndPersist(prisma);
      const statuses = Object.values(PtsStatus).filter(
        (status) => status !== activeStatus && status !== "Rejected",
      );

      for (const status of statuses) {
        await ptsFactory.createAndPersist(prisma, {
          patientId: patient.getId(),
          timeline: ptsFactory.createTimeline({ status: ptsMapper.statusFromPrisma(status) }),
        });
      }

      await expect(rut.rejectEveryProposalByPatientId(patient.getId())).resolves.not.toThrow();

      const rejectedRows = await prisma.projetoTerapeuticoSingular.count({
        where: { patientId: patient.getId().toString(), status: "Rejected" },
      });

      expect(rejectedRows, "it should have updated only the draft PTS").toBe(1);
    },
  );

  it("should be able to run within transactions", { tags: ["transaction"] }, async () => {
    class TestMockedError extends BaseError {
      public constructor() {
        super({});
      }
    }

    const pts = await ptsFactory.createAndPersist(prisma, {
      socialSituation: "original social situation.",
    });

    const originalSocialSituation = pts.getSocialSituation();

    const pipeline = pipe(
      () => rut.getById(pts.getId().toString()),
      te.chainFirstEitherKW((pts) => pts.acceptAndBeginPlanning()),
      te.chainW((pts) => () => {
        pts.updateSocialSituation("new social situation!");
        return rut.save(pts);
      }),
      te.chainFirstW(() => () => rut.rejectEveryProposalByPatientId(pts.toSnapshot().patientId)),

      // forcing an error that should trigger rollback
      te.chainW(() => te.left(new TestMockedError())),
    );

    const result = await txManager.executePipeline(pipeline)();
    expect(e.isLeft(result)).toBe(true);
    expect(result["left"]).toBeInstanceOf(TestMockedError);

    const ptsFromDb = await prisma.projetoTerapeuticoSingular.findUniqueOrThrow({
      where: { id: pts.getId().toString() },
    });

    expect(ptsFromDb.socialSituation).toBe(originalSocialSituation);
    expect(ptsFromDb.status).toBe(PtsStatus.Draft);
    expect(ptsFromDb.rejectedAt).toBeNull();
  });
});
