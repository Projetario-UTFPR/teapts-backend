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

describe("[integration] Prisma PTS Repository", () => {
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

      const shouldHaveRejectedEveryPts = () => rows.every((row) => row.status === "Rejected");
      const shouldHaveSetRejectionTimestamp = () => rows.every((row) => row.rejectedAt !== null);

      expect.toSatisfy(shouldHaveRejectedEveryPts);
      expect.toSatisfy(shouldHaveSetRejectionTimestamp);
    },
  );

  // doing this to keep integrity during this test: patients must have only one active PTS at once
  it.each(["Running", "Planning"] as const satisfies PtsStatus[])(
    "should not reject non-draft PTSs (running with active status '$0')",
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
