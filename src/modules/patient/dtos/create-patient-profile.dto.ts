import { type UUID } from "@/common/uuid";
import { DTO } from "@/infra/http/dto";
import { SupportContact } from "@/modules/patient/value-objects/support-contact.vo";
import { ApiProperty, ApiPropertyOptional, ApiSchema } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import z from "zod";

const schema = z.object({
  accountId: z
    .uuid("O identificador da conta do paciente precisa ser um UUID válido.")
    .transform((val) => val as UUID),
  supportContacts: z
    .array(
      z
        .object({
          name: z.string("O nome do contato de suporte precisa ser um texto."),
          description: z.string("A descrição do contato precisa ser um texto."),
          phone: z.string("O número de telefone precisa ser em formato de texto."),
          email: z.email("O endereço de e-mail fornecido é inválido.").optional(),
        })
        .transform(
          ({ name, description, phone, email }) =>
            new SupportContact(name, description, phone, email),
        ),
      "Se presentes, os contatos de suporte precisam ser uma lista.",
    )
    .optional(),
});

type Schema = z.infer<typeof schema>;

@ApiSchema({ description: "A support contact related of a patient." })
abstract class SupportContactsSchema {
  @Expose()
  @ApiProperty({ description: "The name of the support contact." })
  public readonly name!: string;

  @Expose()
  @ApiProperty({
    description:
      "A brief description of the relationship between the patient and this support contact.",
  })
  public readonly description!: string;

  @Expose()
  @ApiProperty({ description: "The phone number for contact." })
  public readonly phone!: string;

  @Expose()
  @ApiPropertyOptional({
    description: "The e-mail address for contact.",
    type: "string",
    format: "email",
  })
  public readonly email?: string | undefined;
}

@ApiSchema({
  description: "Body for creating a new patient profile for some account.",
})
export class CreatePatientProfileDto extends DTO implements Schema {
  protected schema = schema;

  @Expose()
  @ApiProperty({
    description: "The unique identifier of the patient's account within the system.",
    format: "uuid",
    type: "string",
  })
  public readonly accountId!: UUID;

  @Expose()
  @Transform(({ obj }) => obj.supportContacts)
  @ApiPropertyOptional({
    description: "A list of support contacts.",
    type: [SupportContactsSchema],
  })
  public readonly supportContacts?: SupportContact[];
}
