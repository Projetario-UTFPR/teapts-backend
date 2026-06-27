import { InMemoryProfessionalsRepository } from "@test/mocks/repositories/in-memory/professionals.repository";
import { InMemoryPtsRepository } from "@test/mocks/repositories/in-memory/pts.repository";
import { describe, beforeEach } from "vitest";
import { ApproveDraftPtsService } from "@/modules/therapeutic-journey/services/approve-pts.service";
import { InMemoryTransactionManager } from "@test/mocks/transaction-manager";
import patientsFactory from "@test/factories/patients.factory";
import ptsFactory from "@test/factories/pts.factory";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { either as e } from "fp-ts";
import { PtsDoesNotBelongToPatientError } from "@/modules/therapeutic-journey/errors/pts-does-not-belong-to-patient.error";

describe("[Service] Approve PTS Service", () => {
  let ptsRepo: InMemoryPtsRepository;
  let professionalsRepo: InMemoryProfessionalsRepository;
  let transactionManager: InMemoryTransactionManager;
  let sut: ApproveDraftPtsService;

  beforeEach(() => {
    professionalsRepo = new InMemoryProfessionalsRepository();
    ptsRepo = new InMemoryPtsRepository(professionalsRepo);
    transactionManager = new InMemoryTransactionManager();
    sut = new ApproveDraftPtsService(ptsRepo, transactionManager);
  });

  it("should update the PTS to the 'planning' state", async () => {
    const patient = await patientsFactory.create();
    const draftPts = await ptsFactory.create({ patientId: patient.getId() });

    ptsRepo.items.push(draftPts);

    assert(draftPts.getTimeline().status === PtsTimeline.Status.Draft);

    const result = await sut.execute({
      patientId: patient.getId(),
      ptsId: draftPts.getId(),
    });

    assert(e.isRight(result), "it should have accepted the PTS successfully");

    const savedPts = await ptsRepo.findActivePtsByPatientId(patient.getId());
    assert(e.isRight(savedPts));
    expect(savedPts.right.getId(), "it should have turned the draft PTS into the active one").toBe(
      draftPts.getId(),
    );
  });

  it("should reject every other PTS proposal", async () => {
    const patient = await patientsFactory.create();
    const ptsToApprove = await ptsFactory.create({ patientId: patient.getId() });
    ptsRepo.items.push(ptsToApprove);

    for (let i = 0; i < 10; i++) {
      const pts = await ptsFactory.create({ patientId: patient.getId() });
      ptsRepo.items.push(pts);
    }

    const result = await sut.execute({
      patientId: patient.getId(),
      ptsId: ptsToApprove.getId(),
    });

    assert(e.isRight(result));

    const everyOtherPtsShouldHaveBeenRejected = () =>
      ptsRepo.items.filter((pts) => !pts.equals(ptsToApprove)).every((pts) => pts.isRejected());

    expect.toSatisfy(
      everyOtherPtsShouldHaveBeenRejected,
      "every PTS but the one to be approved should have been rejected.",
    );
  });

  it("should not let a patient approve a PTS that does not belong to him", async () => {
    const unauthorizedPatient = await patientsFactory.create();
    const patient = await patientsFactory.create();
    const pts = await ptsFactory.create({ patientId: patient.getId() });
    ptsRepo.items.push(pts);

    const result = await sut.execute({
      patientId: unauthorizedPatient.getId(),
      ptsId: pts.getId(),
    });

    assert(e.isLeft(result), "it should have forbid");
    expect(result.left).toBeInstanceOf(PtsDoesNotBelongToPatientError);
  });

  it("should not let a patient approve a non-existing PTS", async () => {
    const patient = await patientsFactory.create();

    const result = await sut.execute({
      patientId: patient.getId(),
      ptsId: "unexisting-pts",
    });

    assert(e.isLeft(result), "it should have forbid");
    expect(result.left).toBeInstanceOf(PtsDoesNotBelongToPatientError);
  });
});
