import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { UUID } from "@/common/uuid";
import { PrismaService } from "@/infra/prisma/prisma";
import { ProjetoTerapeuticoSingular } from "@/modules/therapeutic-journey/aggregates/pts.aggregate";
import { PtsRepository } from "@/modules/therapeutic-journey/repositories/pts.repository";
import { Injectable } from "@nestjs/common";
import { Either } from "fp-ts/lib/Either";

@Injectable()
export class PrismaPtsRepository extends PtsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public activePtsExistsByPatientId(patientId: UUID): Promise<Either<IrrecoverableError, boolean>> {
    throw new Error("Method not implemented.");
  }

  public createNewPts(
    pts: ProjetoTerapeuticoSingular,
  ): Promise<Either<IrrecoverableError, ProjetoTerapeuticoSingular>> {
    throw new Error("Method not implemented.");
  }
}
