import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import professionalMapper from "@/infra/prisma/mappers/professionals.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ProfessionalProfileNotFoundError } from "@/modules/professional/errors/professional-profile-not-found.error";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { Injectable } from "@nestjs/common";
import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

@Injectable()
export class PrismaProfessionalsRepository extends ProfessionalsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public findManyByIds(_ids: UUID[]) {
    const ids = _ids.map((id) => id.toString());

    return pipe(
      te.tryCatch(
        () => this.prisma.professional.findMany({ where: { id: { in: ids } } }),
        (error) =>
          new IrrecoverableError({
            message: `Error occurred in ${PrismaProfessionalsRepository.name} when trying to find professionals by ids '${ids}'.`,
            cause: error as Error,
          }),
      ),
      te.map((rawProfessionals) => rawProfessionals.map(professionalMapper.fromPrisma)),
    )();
  }

  public findById(
    id: UUID,
  ): Promise<Either<IrrecoverableError | ProfessionalProfileNotFoundError, Professional>> {
    return pipe(
      te.tryCatch(
        () => this.prisma.professional.findFirst({ where: { id: id.toString() } }),
        (error) =>
          new IrrecoverableError({
            message:
              `Error occurred in ${PrismaProfessionalsRepository.name} when trying to find ` +
              `professional by id "${id.toString()}".`,
            cause: error as Error,
          }),
      ),
      te.chainEitherKW((row) => {
        if (!row) return e.left(new ProfessionalProfileNotFoundError(id));
        return e.right(professionalMapper.fromPrisma(row));
      }),
    )();
  }
}
