import { type UUID } from "@/common/uuid";
import { DTO } from "@/infra/http/dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const updateMultidisciplinaryTeamSchema = z.object({
  ptsId: z.uuid("O ID fornecido para o PTS é inválido.").transform((id) => id as UUID),
  professionalId: z
    .uuid("O ID do profissional operando a ação é inválido.")
    .transform((id) => id as UUID),
  newResponsibleId: z
    .uuid("O ID fornecido para o novo responsável é inválido.")
    .transform((id) => id as UUID)
    .optional(),
  multidisciplinaryTeamIds: z.array(
    z
      .uuid("O ID fornecido para este profissional da equipe é inválido.")
      .transform((id) => id as UUID),
    "Você deve enviar uma lista contendo os identificadores dos profissionais.",
  ),
});

type UpdateMultidisciplinaryTeamSchema = z.infer<typeof updateMultidisciplinaryTeamSchema>;

export class UpdateMultidisciplinaryTeamDTO
  extends DTO
  implements UpdateMultidisciplinaryTeamSchema
{
  protected schema = updateMultidisciplinaryTeamSchema;

  @Expose()
  @ApiProperty({
    description:
      "The unique identifier of the PTS to be updated (commonly extracted from request params).",
    type: "string",
  })
  public readonly ptsId!: UUID;

  @Expose()
  @ApiProperty({
    description:
      "The ID of the professional profile currently executing this action (for permission validation).",
    type: "string",
  })
  public readonly professionalId!: UUID;

  @Expose()
  @ApiPropertyOptional({
    description:
      "The identifier of the new professional to assume responsibility for this PTS, if changing.",
    type: "string",
  })
  public readonly newResponsibleId?: UUID;

  @Expose()
  @ApiProperty({
    description: "The complete list of identifiers representing the new multidisciplinary team.",
    type: "array",
    items: {
      type: "string",
    },
  })
  public readonly multidisciplinaryTeamIds!: UUID[];
}
