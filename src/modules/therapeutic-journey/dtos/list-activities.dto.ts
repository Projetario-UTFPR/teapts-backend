import { BasePaginationDto } from "@/common/pagination/pagination-dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z
    .object({
        professionalId: z.uuid("O ID do profissional precisa ser um UUID válido.").optional(),
    })
    .extend(BasePaginationDto.baseSchema.shape);

type ListActivitiesSchema = z.infer<typeof schema>;

export class ListActivitiesDto extends BasePaginationDto implements ListActivitiesSchema {
    @Expose()
    @ApiPropertyOptional({
        description: "Filters or strictly verifies access for a specific professional profile ID.",
        type: "string",
        format: "uuid",
    })
    public readonly professionalId?: string | undefined;

    protected schema = schema;
}