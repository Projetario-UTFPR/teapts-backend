import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { TimelineRecord } from "@/modules/therapeutic-journey/aggregates/timeline-record.aggregate";
import { Either } from "fp-ts/lib/Either";

export abstract class TimelineRepository {
  public abstract createRecord(
    record: TimelineRecord,
  ): Promise<Either<IrrecoverableError, TimelineRecord>>;
}
