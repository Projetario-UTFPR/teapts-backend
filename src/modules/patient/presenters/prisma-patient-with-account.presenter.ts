import { SupportContactPresenter } from "@/modules/patient/presenters/support-contact.presenter";
import { ApiProperty, ApiPropertyOptional, ApiSchema } from "@nestjs/swagger";
import { Prisma } from "@prisma-gen/client";

@ApiSchema({
  description: "A representation of a patient profile aggregated with data regarding its account.",
})
export class PatientWithAccountPresenter {
  @ApiProperty({ description: "A list of support contacts.", type: [SupportContactPresenter] })
  public readonly supportContacts!: SupportContactPresenter[];

  @ApiProperty({ description: "The ID of the account to which this patient profile belongs." })
  public readonly accountId!: string;

  @ApiProperty({ description: "The patient's name." })
  public readonly name!: string;

  @ApiProperty({ description: "The patient's e-mail address." })
  public readonly email!: string;

  @ApiPropertyOptional({
    description: "The timestamp of the last time the patient's account has been updated.",
    type: "string",
    format: "date-time",
  })
  public readonly lastUpdatedAt?: Date | undefined;

  @ApiProperty({
    description: "The timestamp of when this patient have been registered in the system.",
    type: "string",
    format: "date-time",
  })
  public readonly createdAt!: Date;

  protected constructor(props: PatientWithAccountPresenter) {
    Object.assign(this, props);
  }

  public static present(row: Prisma.PatientModel & { account: Prisma.AccountModel }) {
    return new PatientWithAccountPresenter({
      supportContacts: row.supportContacts.map((contact) =>
        SupportContactPresenter.present(contact as unknown as SupportContactPresenter),
      ),
      accountId: row.account.id,
      createdAt: row.account.createdAt,
      email: row.account.email,
      name: row.account.name,
      lastUpdatedAt: row.account.lastUpdatedAt ?? undefined,
    });
  }
}
