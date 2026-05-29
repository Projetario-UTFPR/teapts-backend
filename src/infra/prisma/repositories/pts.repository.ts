import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { PrismaSchemaForeignKey } from "@/infra/prisma/foreign-keys";
import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { ProfessionalIsNotRegistered } from "@/modules/therapeutic-journey/errors/professional-is-not-registered.error";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaPtsRepository extends PtsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
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

  public async updateMultidisciplinaryTeam(
    pts: ProjetoTerapeuticoSingular,
    multidisciplinaryTeam: UUID[],
  ) {
    const ptsId = pts.getId().toString();

    const currentMultidisciplinaryTeamProfessional =
      await this.prisma.professionalParticipatingOnPTS.findMany({
        where: { ProjetoTerapeuticoSingularId: ptsId },
        select: { professionalId: true },
      });

    const currentIds = currentMultidisciplinaryTeamProfessional.map((p) => p.professionalId);

    const newUUIDsToString = multidisciplinaryTeam.map(String);
    const currentUUIDsToString = currentIds.map(String);

    const allIds = Array.from(new Set([...currentUUIDsToString, ...newUUIDsToString]));
    const { remove, insert } = allIds.reduce(
      (accumulator, object) => {
        const id = object as UUID;
        const idStr = id.toString();

        if (!currentUUIDsToString.includes(idStr) && newUUIDsToString.includes(idStr)) {
          accumulator.insert.push(id);
        }
        if (currentUUIDsToString.includes(idStr) && !newUUIDsToString.includes(idStr)) {
          accumulator.remove.push(id);
        }

        return accumulator;
      },
      { remove: [] as UUID[], insert: [] as UUID[] },
    );

    await this.prisma.$transaction([
      this.prisma.professionalParticipatingOnPTS.deleteMany({
        where: {
          ProjetoTerapeuticoSingularId: ptsId,
          professionalId: { in: remove.map(String) },
        },
      }),

      this.prisma.professionalParticipatingOnPTS.createMany({
        data: insert.map((id) => ({
          ProjetoTerapeuticoSingularId: ptsId,
          professionalId: id.toString(),
        })),
      }),
    ]);
  }

  public async setNewResponsible(pts: ProjetoTerapeuticoSingular, professionalId: UUID) {
    const ptsId = pts.getId().toString();
    const profIdStr = professionalId.toString();

    await this.prisma.$transaction([
      this.prisma.projetoTerapeuticoSingular.update({
        where: { id: ptsId },
        data: { responsibleProfessionalId: profIdStr },
      }),

      this.prisma.professionalParticipatingOnPTS.upsert({
        where: {
          professionalId_ProjetoTerapeuticoSingularId: {
            ProjetoTerapeuticoSingularId: ptsId,
            professionalId: profIdStr,
          },
        },
        update: {}, // Não faz nada se já existir
        create: {
          ProjetoTerapeuticoSingularId: ptsId,
          professionalId: profIdStr,
        },
      }),
    ]);
  }
}
