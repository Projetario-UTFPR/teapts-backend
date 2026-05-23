import { DEFAULT_PAGINATION_LIMIT_PER_PAGE } from "@/common/pagination";
import { DTO } from "@/infra/http/dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

export class BasePaginationDto extends DTO {
  @Expose()
  @ApiPropertyOptional({
    type: "number",
    description: "The page (1-indexed) to query the data from.",
    example: 1,
  })
  public readonly page!: number;

  @Expose()
  @ApiPropertyOptional({
    type: "number",
    description: "How many items must be returned (at most). The actual limit might be shorter.",
    example: DEFAULT_PAGINATION_LIMIT_PER_PAGE,
  })
  public readonly limit?: number | undefined;

  protected schema = BasePaginationDto.baseSchema;
}

export namespace BasePaginationDto {
  export const baseSchema = z.object({
    page: z.coerce
      .number("A página precisa ser um número inteiro.")
      .int("A página precisa ser um número inteiro.")
      .optional()
      .default(1),
    limit: z.coerce
      .number("O limite precisa ser um número.")
      .int("O limite precisa ser um número inteiro.")
      .optional(),
  });
}
