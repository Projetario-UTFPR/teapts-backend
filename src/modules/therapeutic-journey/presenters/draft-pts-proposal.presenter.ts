import professionalsMapper from "@/infra/prisma/mappers/professionals.mapper";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Prisma } from "@prisma-gen/browser";

@ApiSchema({
  description: `A summary of a professional involved with the PTS.`,
})
class DraftPtsProposalProfessionalPresenter {
  @ApiProperty({
    description: "The professional's identifier within the systme.",
    format: "uuid",
  })
  public readonly id!: string;

  @ApiProperty({ description: "The professional's name." })
  public readonly name!: string;

  @ApiProperty({
    description: "The professional's specialism",
    enum: Professional.Specialism,
    example: Professional.Specialism.Psychologist,
  })
  public readonly specialism!: string;

  protected constructor(props: DraftPtsProposalProfessionalPresenter) {
    Object.assign(this, props);
  }

  public static present(
    row: Pick<Prisma.ProfessionalModel, "id" | "specialism"> & {
      account: Pick<Prisma.AccountModel, "name">;
    },
  ) {
    return new DraftPtsProposalProfessionalPresenter({
      id: row.id,
      name: row.account.name,
      specialism: professionalsMapper.specialismFromPrisma(row.specialism).toString(),
    });
  }
}

@ApiSchema({
  description: "Brief details that the patient can access about a draft PTS proposal.",
})
export class DraftPtsProposalPresenter {
  @ApiProperty({ description: "The unique identifier of the PTS.", format: "uuid" })
  public readonly id!: string;

  @ApiProperty({ description: "The professional responsible for this PTS." })
  public readonly responsibleProfessional!: DraftPtsProposalProfessionalPresenter;

  @ApiProperty({ description: "The list of professionals also involved with the PTS." })
  public readonly multidisciplinaryTeam!: DraftPtsProposalProfessionalPresenter[];

  @ApiProperty({
    description: "The date and time when the PTS was drafted.",
    format: "date-time",
  })
  public readonly createdAt!: string;

  protected constructor(props: DraftPtsProposalPresenter) {
    Object.assign(this, props);
  }

  public static present(
    row: Pick<Prisma.ProjetoTerapeuticoSingularModel, "id" | "createdAt"> & {
      responsibleProfessional: Parameters<typeof DraftPtsProposalProfessionalPresenter.present>[0];
      multidisciplinaryTeam: {
        professional: Parameters<typeof DraftPtsProposalProfessionalPresenter.present>[0];
      }[];
    },
  ) {
    return new DraftPtsProposalPresenter({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      multidisciplinaryTeam: row.multidisciplinaryTeam.map(({ professional }) =>
        DraftPtsProposalProfessionalPresenter.present(professional),
      ),
      responsibleProfessional: DraftPtsProposalProfessionalPresenter.present(
        row.responsibleProfessional,
      ),
    });
  }
}
