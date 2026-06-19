import { SupportContact } from "@/modules/patient/value-objects/support-contact.vo";
import { ApiProperty, ApiPropertyOptional, ApiSchema } from "@nestjs/swagger";

@ApiSchema({ description: "A representation of a patient's support contact." })
export class SupportContactPresenter {
  @ApiProperty({ description: "The name or label for this support contact." })
  public readonly name!: string;

  @ApiProperty({ description: "Some useful description regarding this contact." })
  public readonly description!: string;

  @ApiProperty({ description: "The phone number for contact." }) public readonly phone!: string;

  @ApiPropertyOptional({ description: "The e-mail address for contact.", format: "email" })
  public readonly email?: string;

  protected constructor(props: SupportContactPresenter) {
    Object.assign(this, props);
  }

  public static present(supportContact: SupportContactPresenter): SupportContactPresenter;
  public static present(supportContact: SupportContact): SupportContactPresenter {
    return new SupportContactPresenter({
      description: supportContact.description,
      name: supportContact.name,
      phone: supportContact.phone,
      email: supportContact.email,
    });
  }
}
