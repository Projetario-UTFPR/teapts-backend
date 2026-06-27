import { InMemoryProfessionalsRepository } from "@test/mocks/repositories/in-memory/professionals.repository";
import { InMemoryPtsRepository } from "@test/mocks/repositories/in-memory/pts.repository";
import { describe, beforeEach } from "vitest";
import { InMemoryTransactionManager } from "@test/mocks/transaction-manager";
import patientsFactory from "@test/factories/patients.factory";
import ptsFactory from "@test/factories/pts.factory";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { either as e } from "fp-ts";
import { PtsDoesNotBelongToPatientError } from "@/modules/therapeutic-journey/errors/pts-does-not-belong-to-patient.error";
import { RejectDraftPtsService } from "@/modules/therapeutic-journey/services/reject-pts.service";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";

describe("[Service] Reject PTS Service", () => {
  let ptsRepo: InMemoryPtsRepository;
  let professionalsRepo: InMemoryProfessionalsRepository;
  let transactionManager: InMemoryTransactionManager;
  let sut: RejectDraftPtsService;

  beforeEach(() => {
    professionalsRepo = new InMemoryProfessionalsRepository();
    ptsRepo = new InMemoryPtsRepository(professionalsRepo);
    transactionManager = new InMemoryTransactionManager();
    sut = new RejectDraftPtsService(ptsRepo, transactionManager);
  });

  it("should update the PTS to the 'rejected' state", async () => {
    const patient = await patientsFactory.create();
    const draftPts = await ptsFactory.create({ patientId: patient.getId() });

    ptsRepo.items.push(draftPts);

    assert(draftPts.getTimeline().status === PtsTimeline.Status.Draft);

    const result = await sut.execute({
      patientId: patient.getId(),
      ptsId: draftPts.getId(),
    });

    assert(e.isRight(result), "it should have rejected the PTS successfully");

    const savedPts = await ptsRepo.findActivePtsByPatientId(patient.getId());
    assert(e.isLeft(savedPts));
    expect(savedPts.left).toBeInstanceOf(PtsNotFoundError);
  });

  it("should not let a patient reject a PTS that does not belong to him", async () => {
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

  it("should not let a patient reject a non-existing PTS", async () => {
    const patient = await patientsFactory.create();

    const result = await sut.execute({
      patientId: patient.getId(),
      ptsId: "unexisting-pts",
    });

    assert(e.isLeft(result), "it should have forbid");
    expect(result.left).toBeInstanceOf(PtsDoesNotBelongToPatientError);
  });
});
