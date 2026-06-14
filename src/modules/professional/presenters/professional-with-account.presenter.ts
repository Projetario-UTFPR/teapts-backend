import professionalsMapper from "@/infra/prisma/mappers/professionals.mapper";
import { ApiProperty, ApiPropertyOptional, ApiSchema } from "@nestjs/swagger";
import { Prisma } from "@prisma-gen/client";

@ApiSchema({
  description:
    "A representation of a professional profile aggregated with data regarding the account to which it belongs.",
})
export class ProfessionalWithAccountPresenter {
  @ApiProperty({ description: "The ID of this professional profile." })
  public readonly professionalId!: string;

  @ApiProperty({ description: "The ID of the account to which this professional profile belongs." })
  public readonly accountId!: string;

  @ApiProperty({ description: "The name of (the account owning) this professional." })
  public readonly name!: string;

  @ApiProperty({ description: "The e-mail address of (the account owning) this professional." })
  public readonly email!: string;

  @ApiProperty({ description: "The specialism of this professional." })
  public readonly specialism!: string;

  @ApiPropertyOptional({
    description:
      "The timestamp of the last time (the account owning) this professional has been updated.",
    type: Date,
  })
  public readonly lastUpdatedAt?: Date | undefined;

  @ApiProperty({
    description:
      "The timestamp of when (the account owning) this professional have been registered in the system.",
    type: Date,
  })
  public readonly createdAt!: Date;

  protected constructor(props: ProfessionalWithAccountPresenter) {
    Object.assign(this, props);
  }

  public static present(row: Prisma.ProfessionalModel & { account: Prisma.AccountModel }) {
    return new ProfessionalWithAccountPresenter({
      professionalId: row.id,
      accountId: row.account.id,
      name: row.account.name,
      email: row.account.email,
      specialism: professionalsMapper.specialismFromPrisma(row.specialism),
      lastUpdatedAt: row.account.lastUpdatedAt ?? undefined,
      createdAt: row.account.createdAt,
    });
  }
}
