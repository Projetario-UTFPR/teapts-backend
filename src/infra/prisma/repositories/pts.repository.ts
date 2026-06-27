import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { PrismaSchemaForeignKey } from "@/infra/prisma/foreign-keys";
import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { PrismaTransactionManager } from "@/infra/prisma/transaction-manager";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalIsNotRegisteredError } from "@/modules/therapeutic-journey/errors/professional-is-not-registered.error";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { taskEither as te } from "fp-ts";
import { Either, left, right } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaPtsRepository extends PtsRepository {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly txManager: PrismaTransactionManager,
  ) {
    super();
  }

  public findActivePtsByPatientId(
    patientId: UUID,
  ): Promise<Either<IrrecoverableError | PtsNotFoundError, ProjetoTerapeuticoSingular>> {
    const client = this.txManager.getTx() ?? this.prisma;
    return pipe(
      te.tryCatch(
        () =>
          client.projetoTerapeuticoSingular.findFirstOrThrow({
            where: {
              patientId: patientId.toString(),
              status: { in: ["Running", "Planning"] },
            },
            include: {
              multidisciplinaryTeam: { select: { professionalId: true } },
              activities: { select: { id: true } },
            },
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
    const client = this.txManager.getTx() ?? this.prisma;
    return pipe(
      te.tryCatch(
        () =>
          client.projetoTerapeuticoSingular.count({
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
    const basePayload = ptsMapper.intoPrisma(pts);
    const teamPayload = ptsMapper.mapMultidisciplinaryTeam(pts.getMultidisciplinaryTeam());

    const payload = {
      ...basePayload,
      multidisciplinaryTeam: teamPayload.createPayload,
    };

    const client = this.txManager.getTx() ?? this.prisma;

    return pipe(
      te.tryCatch(
        () =>
          client.projetoTerapeuticoSingular.create({
            data: payload,
            include: {
              multidisciplinaryTeam: { select: { professionalId: true } },
              activities: { select: { id: true } },
            },
          }),
        (error) => {
          if (!isForeignKeyError(error)) {
            return new IrrecoverableError({
              message: `Error occurred in ${PrismaPtsRepository.name} when creating the PTS '${JSON.stringify(payload)}'.`,
              cause: error as Error,
            });
          }

          const foreignKey = getForeignKeyViolation(error);

          if (foreignKey === "team") return new ProfessionalIsNotRegisteredError("team");
          if (foreignKey === "other") return new ProfessionalIsNotRegisteredError("responsible");

          return new IrrecoverableError({
            message: `Failed to catch foreign key violation error in ${PrismaPtsRepository.name} when creating the PTS '${JSON.stringify(payload)}'.`,
            cause: error as Error,
          });
        },
      ),
      te.map(ptsMapper.fromPrisma),
    )();
  }

  public async getById(
    id: UUID,
  ): Promise<Either<IrrecoverableError | PtsNotFoundError, ProjetoTerapeuticoSingular>> {
    const client = this.txManager.getTx() ?? this.prisma;

    try {
      const data = await client.projetoTerapeuticoSingular.findUnique({
        where: {
          id: id.toString(),
        },
        include: {
          multidisciplinaryTeam: { select: { professionalId: true } },
          activities: { select: { id: true } },
        },
      });

      if (!data) {
        return left(new PtsNotFoundError());
      }

      return right(ptsMapper.fromPrisma(data));
    } catch (error) {
      return left(
        new IrrecoverableError({
          message: `Error occurred in ${PrismaPtsRepository.name} when trying to get PTS by ID "${id.toString()}".`,
          cause: error as Error,
        }),
      );
    }
  }

  public async save(pts: ProjetoTerapeuticoSingular) {
    const basePayload = ptsMapper.intoPrisma(pts);
    const teamPayload = ptsMapper.mapMultidisciplinaryTeam(pts.getMultidisciplinaryTeam());

    const client = this.txManager.getTx() ?? this.prisma;

    try {
      await client.projetoTerapeuticoSingular.update({
        where: { id: pts.getId().toString() },
        data: {
          ...basePayload,
          multidisciplinaryTeam: teamPayload.updatePayload,
        },
      });

      return right(undefined);
    } catch (error) {
      if (!isForeignKeyError(error)) {
        return left(
          new IrrecoverableError({
            cause: error as Error,
            message: `Error occurred in ${PrismaPtsRepository.name} when saving the PTS '${pts.getId().toString()}'.`,
          }),
        );
      }

      const violation = getForeignKeyViolation(error);

      if (violation === "team") return left(new ProfessionalIsNotRegisteredError("team"));
      if (violation === "other") return left(new ProfessionalIsNotRegisteredError("responsible"));

      return left(
        new IrrecoverableError({
          message: `Failed to catch foreign key violation error in ${PrismaPtsRepository.name} when saving the PTS '${JSON.stringify(basePayload)}'.`,
          cause: error as Error,
        }),
      );
    }
  }

  public rejectEveryProposalByPatientId(patientId: UUID) {
    const now = new Date();
    const client = this.txManager.getTx() ?? this.prisma;
    return pipe(
      te.tryCatch(
        () =>
          client.projetoTerapeuticoSingular.updateMany({
            where: { patientId: patientId.toString(), status: "Draft" },
            data: { status: "Rejected", rejectedAt: now },
          }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${PrismaPtsRepository.name} when rejecting many draft PTSs by patient ID.`,
            cause: error as Error,
          }),
      ),
      te.map(() => {}),
    )();
  }
}

function isForeignKeyError(error: unknown): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2003";
}

function getForeignKeyViolation(error: PrismaClientKnownRequestError) {
  const exceprtContainingConstraint: string =
    error?.meta?.["driverAdapterError"]?.["cause"]?.constraint?.index ?? error.message;

  const responsibleProfessionalDoesNotExist = exceprtContainingConstraint.includes(
    PrismaSchemaForeignKey.PtsResponsibleProfessionalId,
  );

  if (responsibleProfessionalDoesNotExist) return "responsible";

  const someProfessionalFromMultidisciplinaryTeamDoesNotExist =
    exceprtContainingConstraint.includes(
      PrismaSchemaForeignKey.ProfessionalMembershipOnPtsProfessionalId,
    );

  if (someProfessionalFromMultidisciplinaryTeamDoesNotExist) return "team";

  return "other";
}
