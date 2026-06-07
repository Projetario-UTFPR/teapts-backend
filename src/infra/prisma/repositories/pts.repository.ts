import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { WatchedList } from "@/core/watched-list";
import { PrismaSchemaForeignKey } from "@/infra/prisma/foreign-keys";
import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalIsNotRegistered } from "@/modules/therapeutic-journey/errors/professional-is-not-registered.error";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { Injectable } from "@nestjs/common";
import { PtsStatus } from "@prisma-gen/enums";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { taskEither as te } from "fp-ts";
import { Either, left, right } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaPtsRepository extends PtsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public findActivePtsByPatientId(
    patientId: UUID,
  ): Promise<Either<IrrecoverableError | PtsNotFoundError, ProjetoTerapeuticoSingular>> {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.projetoTerapeuticoSingular.findFirstOrThrow({
            where: {
              patientId: patientId.toString(),
              status: { in: ["Running", "Planning"] },
            },
            include: { multidisciplinaryTeam: { select: { professionalId: true } } },
          }),
        (error) => {
          if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
            return new PtsNotFoundError();
          }

          return new IrrecoverableError({
            message: `Error occurred in ${PrismaPtsRepository.name} when trying to count active PTS from patient of ID '${patientId}'.`,
            cause: error as Error,
          });
        },
      ),
      te.map(ptsMapper.fromPrisma),
    )();
  }

  public activePtsExistsByPatientId(patientId: UUID): Promise<Either<IrrecoverableError, boolean>> {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.projetoTerapeuticoSingular.count({
            where: {
              patientId: patientId.toString(),
              status: { in: ["Running", "Planning"] },
            },
          }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${PrismaPtsRepository.name} when trying to count active PTS from patient of ID '${patientId}'.`,
            cause: error as Error,
          }),
      ),
      te.map((count) => count !== 0),
    )();
  }

  public createNewPts(pts: ProjetoTerapeuticoSingular) {
    const payload = ptsMapper.intoPrisma(pts);

    return pipe(
      te.tryCatch(
        () =>
          this.prisma.projetoTerapeuticoSingular.create({
            data: payload,
            include: { multidisciplinaryTeam: { select: { professionalId: true } } },
          }),
        (error) => {
          const isUnexistingProfessionalError =
            error instanceof PrismaClientKnownRequestError && error.code === "P2003";

          if (!isUnexistingProfessionalError) {
            return new IrrecoverableError({
              message: `Error occurred in ${PrismaPtsRepository.name} when creating the PTS '${JSON.stringify(payload)}'.`,
              cause: error as Error,
            });
          }

          const exceprtContainingConstraint: string =
            error?.meta?.["driverAdapterError"]?.["cause"]?.constraint?.index ?? error.message;

          const responsibleProfessionalDoesNotExist =
            isUnexistingProfessionalError &&
            exceprtContainingConstraint.includes(
              PrismaSchemaForeignKey.PtsResponsibleProfessionalId,
            );

          if (responsibleProfessionalDoesNotExist)
            return new ProfessionalIsNotRegistered("responsible");

          const someProfessionalFromMultidisciplinaryTeamDoesNotExist =
            isUnexistingProfessionalError &&
            exceprtContainingConstraint.includes(
              PrismaSchemaForeignKey.ProfessionalMembershipOnPtsProfessionalId,
            );

          if (someProfessionalFromMultidisciplinaryTeamDoesNotExist)
            return new ProfessionalIsNotRegistered("team");

          return new IrrecoverableError({
            message: `Failed to catch foreign key violation error in ${PrismaPtsRepository.name} when creating the PTS '${JSON.stringify(payload)}'.`,
            cause: error as Error,
          });
        },
      ),
      te.map(ptsMapper.fromPrisma),
    )();
  }

  public async getById(id: UUID): Promise<ProjetoTerapeuticoSingular | null> {
    const idString = id.toString();

    const data = await this.prisma.projetoTerapeuticoSingular.findUnique({
      where: {
        id: idString,
      },
      include: {
        multidisciplinaryTeam: true,
      },
    });

    if (!data) {
      return null;
    }

    const professionalIds = data.multidisciplinaryTeam.map(
      (professional) => professional.professionalId,
    );

    const multidisciplinaryTeam = new WatchedList<UUID>(professionalIds);

    const timeline = PtsTimeline.createUnchecked({
      status: data.status as PtsTimeline.Status,
      createdAt: data.createdAt,
      acceptedAt: data.acceptedAt ?? undefined,
      rejectedAt: data.rejectedAt ?? undefined,
      beganAt: data.beganAt ?? undefined,
      concludedAt: data.concludedAt ?? undefined,
      cancelledAt: data.cancelledAt ?? undefined,
    });

    return ProjetoTerapeuticoSingular.createUnchecked({
      id: data.id,
      patientId: data.patientId,
      responsibleProfessionalId: data.responsibleProfessionalId,
      socialSituation: data.socialSituation,
      timeline,
      multidisciplinaryTeam,
    });
  }

  public async save(pts: ProjetoTerapeuticoSingular): Promise<Either<IrrecoverableError, true>> {
    try {
      await this.prisma.projetoTerapeuticoSingular.update({
        where: { id: pts.getId().toString() },
        data: ptsMapper.intoPrisma(pts, "update"),
      });

      return right(true);
    } catch (error) {
      return left(
        new IrrecoverableError({
          cause: error as Error,
          message: `Error occurred in ${PrismaPtsRepository.name} when saving the PTS '${pts.getId().toString()}'.`,
        }),
      );
    }
  }
}
