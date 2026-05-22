import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaPtsRepository extends PtsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  // TODO: add integration tests to this method
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

  public createNewPts(
    pts: ProjetoTerapeuticoSingular,
  ): Promise<Either<IrrecoverableError, ProjetoTerapeuticoSingular>> {
    const payload = ptsMapper.intoPrisma(pts);

    return pipe(
      te.tryCatch(
        () =>
          this.prisma.projetoTerapeuticoSingular.create({
            data: payload,
            include: { multidisciplinaryTeam: { select: { professionalId: true } } },
          }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${PrismaPtsRepository.name} when creating the PTS '${JSON.stringify(payload)}'.`,
            cause: error as Error,
          }),
      ),
      te.map(ptsMapper.fromPrisma),
    )();
  }
}
