import { ApiProperty } from "@nestjs/swagger";

export class ValidationErrorBagPresenter {
  @ApiProperty({
    example: {
      email: ["O e-mail fornecido é inválido."],
      password: ["A senha é um campo obrigatório."],
    },
    type: "object",
    additionalProperties: {
      type: "array",
      description: "Grouped validation error messages related to this field.",
      items: {
        type: "string",
        description: "A human-readable text explaining what is wrong with this input.",
      },
    },
    description:
      "A map of every invalid field and their validation error messages. Note that valid fields are not included in the map.",
  })
  public readonly errors!: Record<string, string[]>;

  public constructor(props: ValidationErrorBagPresenter) {
    Object.assign(this, props);
  }
}
