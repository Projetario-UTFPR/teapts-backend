import { type UUID } from "@/common/uuid";
import { DTO } from "@/infra/http/dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z.object({
  patientId: z.uuid("O ID fornecido para o paciente é inválido.").transform((id) => id as UUID),
  professionalId: z
    .uuid("O ID do profissional fornecido é inválido.")
    .transform((id) => id as UUID),
  socialSituation: z.string("A situação social precisa ser um texto."),
  multidisciplinaryTeamIds: z
    .array(
      z.uuid("O ID fornecido para este profissional é inválido."),
      "Você deve enviar os identificadores dos profissionais que comporão a equipe multidisciplinar.",
    )
    .optional(),
});

type CreatePtsSchema = z.infer<typeof schema>;

export class CreatePtsDto extends DTO implements CreatePtsSchema {
  protected schema = schema;

  @Expose()
  @ApiProperty({
    description: "The ID of the professional (profile) with which you intend to create this PTS.",
    type: "string",
  })
  public readonly professionalId!: UUID;

  @Expose()
  @ApiProperty({
    description: "The ID of the patient to whom the PTS is being drafted to.",
    type: "string",
  })
  public readonly patientId!: UUID;

  @Expose()
  @ApiProperty({
    description: "The initial analytics and description of the social situation of the patient.",
    type: "string",
  })
  public readonly socialSituation!: string;

  @Expose()
  @ApiPropertyOptional({
    description:
      "The identifiers of the initial professionals composing the multidisciplinary team of this PTS.",
    type: "array",
    items: {
      type: "string",
      description:
        "The identifier of one professional to be member of the multidisciplinary team of this PTS.",
    },
  })
  public readonly multidisciplinaryTeamIds?: string[];
}
