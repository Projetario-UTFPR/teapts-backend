import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import professionalMapper from "@/infra/prisma/mappers/professional.mapper";
import { PrismaService } from "@/infra/prisma/prisma";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
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
}
