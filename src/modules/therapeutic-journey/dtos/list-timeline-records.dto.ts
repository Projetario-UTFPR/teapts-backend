import { BasePaginationDto } from "@/common/pagination/pagination-dto";
import { TimelineRecord } from "@/modules/therapeutic-journey/aggregates/timeline-record.aggregate";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z
  .object({
    professionalId: z.uuid("O ID do profissional precisa ser um UUID válido.").optional(),
    target: z
      .enum(TimelineRecord.TargetType, {
        error: "O alvo (target) fornecido para o filtro é inválido.",
      })
      .optional(),
    type: z
      .enum(TimelineRecord.Type, {
        error: "O tipo (type) de evento fornecido para o filtro é inválido.",
      })
      .optional(),
    description: z.string().trim().optional(),
    startDate: z.coerce
      .date({ error: () => ({ message: "A data inicial (startDate) é inválida." }) })
      .optional(),
    endDate: z.coerce
      .date({ error: () => ({ message: "A data final (endDate) é inválida." }) })
      .optional(),
  })
  .extend(BasePaginationDto.baseSchema.shape);

type ListTimelineRecordsSchema = z.infer<typeof schema>;

export class ListTimelineRecordsDto extends BasePaginationDto implements ListTimelineRecordsSchema {
  @Expose()
  @ApiPropertyOptional({
    description: "Filters the timeline records by a specific professional profile ID.",
    type: "string",
    format: "uuid",
  })
  public readonly professionalId?: string | undefined;

  @Expose()
  @ApiPropertyOptional({
    description: "Filters the timeline records by a specific target (e.g., pts, activity).",
    enum: TimelineRecord.TargetType,
  })
  public readonly target?: TimelineRecord.TargetType | undefined;

  @Expose()
  @ApiPropertyOptional({
    description:
      "Filters the timeline records by the nature of the event (e.g., created, approved).",
    enum: TimelineRecord.Type,
  })
  public readonly type?: TimelineRecord.Type | undefined;

  @Expose()
  @ApiPropertyOptional({
    description: "Filters the timeline records by text search in the description.",
    type: "string",
  })
  public readonly description?: string | undefined;

  @Expose()
  @ApiPropertyOptional({
    description: "Filters the timeline records starting from this date and time (ISO 8601).",
    type: "string",
    format: "date-time",
  })
  public readonly startDate?: Date | undefined;

  @Expose()
  @ApiPropertyOptional({
    description: "Filters the timeline records up to this date and time (ISO 8601).",
    type: "string",
    format: "date-time",
  })
  public readonly endDate?: Date | undefined;

  protected schema = schema;
}
