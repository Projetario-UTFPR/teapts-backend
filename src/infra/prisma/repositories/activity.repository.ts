import { ActivityRepository } from "@/modules/therapeutic-journey/repositories/activity.repository";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { Activity } from "@/modules/therapeutic-journey/aggregates/activity.aggregate";
import { Either } from "fp-ts/lib/Either";
import activityMapper from "../mappers/activity.mapper";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaActivityRepository extends ActivityRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public createNewActivity(activity: Activity): Promise<Either<IrrecoverableError, Activity>> {
    return pipe(
      te.Do,
      te.let("payload", () => activityMapper.intoPrisma(activity)),
      te.let("snapshot", () => activity.toSnapshot()),
      te.bindW("prismaActivity", ({ payload, snapshot }) =>
        te.tryCatch(
          () =>
            this.prisma.activity.create({
              data: {
                ...payload,
                activityReferringToDocuments: {
                  create: snapshot.documentsIds.map((id) => ({
                    documentId: id.toString(),
                  })),
                },
              },
              include: {
                activityReferringToDocuments: true,
              },
            }),
          (error) =>
            new IrrecoverableError({
              message: `Error occurred in ${PrismaActivityRepository.name} when creating the Activity '${JSON.stringify(payload)}'.`,
              cause: error as Error,
            }),
        ),
      ),
      te.map(({ prismaActivity }) =>
        activityMapper.fromPrisma({
          ...prismaActivity,
          documents: prismaActivity.activityReferringToDocuments.map((relation) => ({
            id: relation.documentId,
          })),
        }),
      ),
    )();
  }
}
