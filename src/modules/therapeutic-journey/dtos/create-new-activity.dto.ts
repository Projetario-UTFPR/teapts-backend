import { type UUID } from "@/common/uuid";
import { DTO } from "@/infra/http/dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { z } from "zod";
import { FrequencyDto } from "@/common/time/dtos/frequency.dto";

const createActivitySchema = z.object({
  title: z.string().min(1, "O título da atividade é obrigatório."),

  professionalId: z
    .uuid("O ID do profissional atribuído é inválido.")
    .transform((id) => id as UUID),

  documentsIds: z
    .array(
      z.uuid("O ID fornecido para este documento é inválido.").transform((id) => id as UUID),
      "Você deve enviar uma lista contendo os identificadores dos documentos.",
    )
    .optional()
    .default([]),

  frequency: FrequencyDto.schema,
});

type CreateActivitySchema = z.infer<typeof createActivitySchema>;

export class CreateActivityDTO extends DTO implements CreateActivitySchema {
  protected schema = createActivitySchema;

  @Expose()
  @ApiProperty({
    description: "O título da atividade a ser realizada.",
    type: "string",
    example: "Sessão de Fisioterapia Motora",
  })
  public readonly title!: string;

  @Expose()
  @ApiProperty({
    description: "The ID of the professional assigned to execute this activity.",
    type: "string",
    format: "uuid",
  })
  public readonly professionalId!: UUID;

  @Expose()
  @ApiPropertyOptional({
    description: "A list of identifiers for documents attached to this activity.",
    type: "array",
    format: "uuid",
    items: {
      type: "string",
    },
  })
  public readonly documentsIds!: UUID[];

  @Expose()
  @Transform(({ obj }) => obj.frequency)
  @ApiProperty({
    description: "The time frequency configuration for the activity.",
    type: FrequencyDto,
    example: {
      times: 3,
      interval: "week",
      duration: [2, "month"],
    },
  })
  public readonly frequency!: FrequencyDto;
}
