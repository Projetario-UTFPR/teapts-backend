import ptsMapper from "@/infra/prisma/mappers/pts.mapper";
import { PatientPresenter } from "@/modules/patient/presenters/prisma-patient.presenter";
import { ProfessionalWithAccountPresenter } from "@/modules/professional/presenters/professional-with-account.presenter";
import { PtsTimeline } from "@/modules/therapeutic-journey/value-objects/pts-timeline.vo";
import { ApiProperty, ApiPropertyOptional, ApiSchema } from "@nestjs/swagger";
import { Prisma } from "@prisma-gen/client";

@ApiSchema({
  description:
    "A representation of a professional profile aggregated with data regarding the account " +
    "to which it belongs.",
})
export class PtsWithProfessionalAndPatientPresenter {
  @ApiProperty({ description: "", format: "uuid" }) public readonly id!: string;

  @ApiProperty({ description: "Details regarding the patient of the PTS.", type: PatientPresenter })
  public readonly patient!: PatientPresenter;

  @ApiProperty({ description: "The professional responsible for this PTS." })
  public readonly responsibleProfessional!: ProfessionalWithAccountPresenter;

  @ApiPropertyOptional({
    description:
      "Details and notes regarding the patient's social situation. Only present when a " +
      "professional is accessing the PTS rather than its patient.",
  })
  public readonly socialSituation?: string;

  @ApiProperty({ description: "The status of the PTS.", enum: PtsTimeline.Status })
  public readonly status!: PtsTimeline.Status;

  @ApiProperty({
    description: "The date and time when this PTS was created and proposed to the patient.",
    type: Date,
  })
  public readonly createdAt!: string;

  @ApiPropertyOptional({
    description: "The date and time when it was accepted by the patient.",
    type: Date,
  })
  public readonly acceptedAt?: string;

  @ApiPropertyOptional({
    description: "The date and time when it was rejected by the patient.",
    type: Date,
  })
  public readonly rejectedAt?: string;

  @ApiPropertyOptional({
    description: "The date and time when this PTS was initiated.",
    type: Date,
  })
  public readonly beganAt?: string;

  @ApiPropertyOptional({
    description: "The date and time when this PTS was terminated.",
    type: Date,
  })
  public readonly concludedAt?: string;

  @ApiPropertyOptional({
    description: "The date and time when this PTS was cancelled.",
    type: Date,
  })
  public readonly cancelledAt?: string;
  protected constructor(props: PtsWithProfessionalAndPatientPresenter) {
    Object.assign(this, props);
  }

  public static present(
    row: Omit<
      Prisma.ProjetoTerapeuticoSingularModel,
      "patientId" | "responsibleProfessionalId" | "socialSituation"
    > & {
      patient: Prisma.PatientModel;
      responsibleProfessional: Parameters<typeof ProfessionalWithAccountPresenter.present>[0];
      socialSituation: string | undefined;
    },
  ) {
    return new PtsWithProfessionalAndPatientPresenter({
      id: row.id,
      patient: PatientPresenter.present(row.patient),
      responsibleProfessional: ProfessionalWithAccountPresenter.present(
        row.responsibleProfessional,
      ),
      socialSituation: row.socialSituation,
      status: ptsMapper.statusFromPrisma(row.status),
      createdAt: row.createdAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString(),
      beganAt: row.beganAt?.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString(),
      concludedAt: row.concludedAt?.toISOString(),
      rejectedAt: row.rejectedAt?.toISOString(),
    });
  }
}
