import { SupportContactPresenter } from "@/modules/patient/presenters/support-contact.presenter";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Prisma } from "@prisma-gen/client";

@ApiSchema({
  description:
    "A representation of a professional profile aggregated with data regarding the account to which it belongs.",
})
export class PatientPresenter {
  @ApiProperty({ description: "A list of support contacts.", type: [SupportContactPresenter] })
  public readonly supportContacts!: SupportContactPresenter[];

  protected constructor(props: PatientPresenter) {
    Object.assign(this, props);
  }

  public static present(row: Prisma.PatientModel) {
    return new PatientPresenter({
      supportContacts: row.supportContacts.map((contact) =>
        SupportContactPresenter.present(contact as unknown as SupportContactPresenter),
      ),
    });
  }
}
