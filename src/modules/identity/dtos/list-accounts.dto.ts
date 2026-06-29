import { BasePaginationDto } from "@/common/pagination/pagination-dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z
  .object({
    isPatient: z
      .stringbool(
        "O filtro de contas com/sem perfil de paciente deve ter um dos valores 'true' ou 'false'.",
      )
      .optional(),
    isProfessional: z
      .stringbool(
        "O filtro de contas que são ou não profissionais deve ter um dos valores 'true' ou 'false'.",
      )
      .optional(),
  })
  .extend(BasePaginationDto.baseSchema.shape);

type ListAccountsSchema = z.infer<typeof schema>;

export class ListAccountsDto extends BasePaginationDto implements ListAccountsSchema {
  @Expose()
  @ApiPropertyOptional({
    description: "Filters accounts that have or have not a patient profile attached to it.",
    type: "boolean",
  })
  isPatient?: boolean;

  @Expose()
  @ApiPropertyOptional({
    description:
      "Filters accounts that have at least one professional profile or that have none at all.",
    type: "boolean",
  })
  isProfessional?: boolean;

  protected schema = schema;
}
