import { BasePaginationDto } from "@/common/pagination/pagination-dto";
import { type UUID } from "@/common/uuid";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z
  .object({
    responsibleProfessionalId: z
      .uuid("O ID do profissional responsável precisa ser um UUID válido.")
      .transform((val) => (val ? (val as UUID) : undefined))
      .optional(),
    professionalId: z
      .uuid("O ID do profissional responsável precisa ser um UUID válido.")
      .transform((val) => (val ? (val as UUID) : undefined))
      .optional(),
    draftedAfter: z.coerce.date("A data inicial é inválida.").optional(),
    draftedBefore: z.coerce.date("A data limite é inválida.").optional(),
  })
  .extend(BasePaginationDto.baseSchema.shape);

type ListTimelineRecordsSchema = z.infer<typeof schema>;

export class ListDraftPtsProposalsDto
  extends BasePaginationDto
  implements ListTimelineRecordsSchema
{
  @Expose()
  @ApiPropertyOptional({
    description: "Filters by the ID of the professional responsible for the case.",
    example: "987e6543-e21b-12d3-a456-426614174000",
    format: "uuid",
  })
  public readonly responsibleProfessionalId?: UUID;

  @Expose()
  @ApiPropertyOptional({
    description: "Filters by the ID of any specific professional involved in the PTS.",
    example: "555e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  public readonly professionalId?: UUID;

  @Expose()
  @ApiPropertyOptional({
    description: "Filters PTSs drafted from this date onwards (inclusive).",
    example: "2026-06-01T00:00:00.000Z",
    format: "date-time",
  })
  public readonly draftedAfter?: Date;

  @Expose()
  @ApiPropertyOptional({
    description: "Filters PTSs drafted up to this date (inclusive)",
    example: "2026-06-30T23:59:59.999Z",
    format: "date-time",
  })
  public readonly draftedBefore?: Date;

  protected schema = schema;
}
