import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import timelineRecordMapper from "@/infra/prisma/mappers/timeline-record.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { TimelineRecord } from "@/modules/therapeutic-journey/aggregates/timeline-record.aggregate";
import { TimelineRepository } from "@/modules/therapeutic-journey/repositories/timeline.repository";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaTimelineRepository extends TimelineRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public createRecord(record: TimelineRecord): Promise<Either<IrrecoverableError, TimelineRecord>> {
    const payload = timelineRecordMapper.intoPrisma(record);

    return pipe(
      te.tryCatch(
        () => this.prisma.timelineRecord.create({ data: payload }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${PrismaTimelineRepository.name} when creating a new timeline record: ${payload}.`,
            cause: error as Error,
          }),
      ),
      te.map(timelineRecordMapper.fromPrisma),
    )();
  }
}
