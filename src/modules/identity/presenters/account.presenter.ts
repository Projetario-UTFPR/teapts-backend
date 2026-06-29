import { ApiProperty, ApiPropertyOptional, ApiSchema } from "@nestjs/swagger";
import { Prisma } from "@prisma-gen/client";

@ApiSchema({
  description:
    "A representation of a professional profile aggregated with data regarding the account to which it belongs.",
})
export class AccountPresenter {
  @ApiProperty({ description: "The account's unique identifier within the system." })
  public readonly id!: string;

  @ApiProperty({ description: "The real name of the person using this account." })
  public readonly name!: string;

  @ApiProperty({ description: "Whether this account belongs to a patient.", type: "boolean" })
  public readonly isPatient!: boolean;

  @ApiProperty({ description: "Whether this account belongs to a professional.", type: "boolean" })
  public readonly isProfessional!: boolean;

  @ApiProperty({ description: "The account's e-mail address." })
  public readonly email!: string;

  @ApiPropertyOptional({
    description: "The timestamp of the last time this account has been updated.",
    type: "string",
    format: "date-time",
  })
  public readonly lastUpdatedAt?: string | undefined;

  @ApiProperty({
    description: "The timestamp of when this account have been registered in the system.",
    type: "string",
    format: "date-time",
  })
  public readonly createdAt!: string;

  protected constructor(props: AccountPresenter) {
    Object.assign(this, props);
  }

  public static present(
    row: Prisma.AccountModel & {
      _count: { professionalProfiles: number };
      patientProfile: unknown | null;
    },
  ) {
    return new AccountPresenter({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: new Date(row.createdAt).toISOString(),
      lastUpdatedAt: row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toISOString() : undefined,
      isPatient: row.patientProfile !== null,
      isProfessional: row._count.professionalProfiles > 0,
    });
  }
}
