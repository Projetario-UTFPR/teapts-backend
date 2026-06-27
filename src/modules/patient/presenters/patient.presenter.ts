import { Patient } from "@/modules/patient/aggregates/patient.aggregate";
import { SupportContactPresenter } from "@/modules/patient/presenters/support-contact.presenter";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Prisma } from "@prisma-gen/client";

@ApiSchema({
  description: "A representation of a patient profile.",
})
export class PatientPresenter {
  @ApiProperty({ description: "A list of support contacts.", type: [SupportContactPresenter] })
  public readonly supportContacts!: SupportContactPresenter[];

  protected constructor(props: PatientPresenter) {
    Object.assign(this, props);
  }

  public static present(patient: Patient): PatientPresenter;
  public static present(row: Prisma.PatientModel): PatientPresenter;
  public static present(patient: Patient | Prisma.PatientModel) {
    if (patient instanceof Patient) {
      return new PatientPresenter({
        supportContacts: patient
          .getSupportContacts()
          .map((contact) =>
            SupportContactPresenter.present(contact as unknown as SupportContactPresenter),
          ),
      });
    }

    return new PatientPresenter({
      supportContacts: patient.supportContacts.map((contact) =>
        SupportContactPresenter.present(contact as unknown as SupportContactPresenter),
      ),
    });
  }
}
