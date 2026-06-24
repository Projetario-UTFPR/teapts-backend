/**
 * This service does not have tests since it's trivial.
 * Tests regarding registers worth being placed inside test suits testing
 * features that uses this service (e.g.: testing the record is created
 * upon activity creation).
 */
import { Injectable } from "@nestjs/common";
import { pipe } from "fp-ts/lib/function";
import { taskEither as te } from "fp-ts";
import type { UUID } from "@/common/uuid";
import { TimelineRecord } from "@/modules/therapeutic-journey/aggregates/timeline-record.aggregate";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { TimelineRepository } from "@/modules/therapeutic-journey/repositories/timeline.repository";

type Params = Omit<Parameters<(typeof TimelineRecord)["create"]>[0], "ptsId"> & { patientId: UUID };

/**
 * Creates a Timeline Record regarding some change in given's patient's active PTS
 * (including activities, goals and other components from the PTS).
 *
 * @note This service does not ensure the professional (identified by
 * `responsibleProfessionalId`) is authorized to access that PTS, nor perform any
 * security check. Face this as a sort of a logging service.
 */
@Injectable()
export class CreateActivePtsTimelineRecordService {
  public constructor(
    private readonly ptsRepository: PtsRepository,
    private readonly timelineRepository: TimelineRepository,
  ) {}

  public execute({
    description,
    target,
    targetId,
    type,
    responsibleProfessionalId,
    patientId,
  }: Params) {
    return pipe(
      () => this.ptsRepository.findActivePtsByPatientId(patientId),
      te.map((pts) =>
        TimelineRecord.create({
          ptsId: pts.getId(),
          description,
          target,
          targetId,
          type,
          responsibleProfessionalId,
        }),
      ),
      te.chainW((timelineRecord) => () => this.timelineRepository.createRecord(timelineRecord)),
    )();
  }
}
