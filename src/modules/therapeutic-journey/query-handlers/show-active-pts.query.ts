import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import { PrismaService } from "@/infra/prisma/prisma";
import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { type UUID } from "@/common/uuid";
import { PtsNotFoundError } from "@/modules/therapeutic-journey/errors/pts-not-found.error";
import { PtsWithProfessionalAndPatientPresenter } from "@/modules/professional/presenters/pts-with-professional-and-patient.presenter";

export type Params = {
  patientId: UUID;
  shallOmitSocialSituation: boolean;
};

@Injectable()
export class ShowActivePtsQueryHandler {
  public constructor(private readonly prisma: PrismaService) {}

  public execute({ patientId, shallOmitSocialSituation }: Params) {
    return pipe(
      te.tryCatch(
        () =>
          this.prisma.projetoTerapeuticoSingular.findFirst({
            where: { patientId: patientId.toString(), status: { in: ["Planning", "Running"] } },
            omit: {
              patientId: true,
              responsibleProfessionalId: true,
            },
            include: {
              patient: true,
              responsibleProfessional: { include: { account: true } },
              multidisciplinaryTeam: { select: { professional: { select: { id: true } } } },
            },
          }),
        (error) =>
          new IrrecoverableError({
            message: `Unexpected error occurred in ${ShowActivePtsQueryHandler.name} when counting professionals.`,
            cause: error as Error,
          }),
      ),
      te.filterOrElseW(
        (pts) => !!pts,
        () => new PtsNotFoundError(),
      ),
      te.map((row) => {
        const { socialSituation, ...ptsProps } = row;
        const resolvedSocialSituation = shallOmitSocialSituation ? undefined : socialSituation;
        return PtsWithProfessionalAndPatientPresenter.present({
          ...ptsProps,
          socialSituation: resolvedSocialSituation,
        });
      }),
    )();
  }
}
