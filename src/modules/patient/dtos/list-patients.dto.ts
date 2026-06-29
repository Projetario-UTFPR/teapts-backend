import { BasePaginationDto } from "@/common/pagination/pagination-dto";
import { type UUID } from "@/common/uuid";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z
  .object({
    professionalAccountId: z
      .uuid("O ID da conta do profissional precisa ser um UUID válido.")
      .transform((val) => val as UUID)
      .optional(),
    withActivePts: z
      .stringbool(
        "A escolha entre pacientes com ou sem PTS ativo deve ser representada por um valor booleano.",
      )
      .optional(),
  })
  .extend(BasePaginationDto.baseSchema.shape);

type ListPatientsSchema = z.infer<typeof schema>;

export class ListPatientsDto extends BasePaginationDto implements ListPatientsSchema {
  @Expose()
  @ApiPropertyOptional({
    description:
      "Filters only patients with any active PTS (if 'true') or only those with none active active PTS (if 'false').",
    type: "boolean",
  })
  public readonly withActivePts?: boolean;

  @Expose()
  @ApiPropertyOptional({
    description:
      "When present, list only those whom own a PTS that has the professional as responsible or " +
      "as multidisciplinary team member. It considers the professional's account rather than the professional profile.",
    type: "string",
    format: "uuid",
  })
  public readonly professionalAccountId?: UUID;

  protected schema = schema;
}
