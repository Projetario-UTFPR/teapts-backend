import { BasePaginationDto } from "@/common/pagination/pagination-dto";
import { Professional } from "@/modules/professional/entities/professional.aggregate";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z
  .object({
    name: z.string("O nome precisa ser um texto.").optional(),
    specialisms: z
      .preprocess(
        (value) => {
          if (typeof value === "string") {
            // transform values like "psychologist,fono,physiotherapist,foo" or "doctor" into
            // arrays ["psychologist", "fono", "physiotherapist", "foo"] and ["doctor"].
            //
            // not necessary but not bad to support this format either...
            // also we don't need to worry about white spaces, since they're not allowed in URLs.
            return value.split(",").filter((value) => value !== "");
          }

          if (!value) return undefined;

          return value;
        },
        z.array(
          z.enum(Object.values(Professional.Specialism), {
            error: ({ values }) =>
              `As especialidades buscadas precisam ser um ou mais dos seguintes valores: ${values.join(", ")}.`,
          }),
          "As especialidades precisam ser uma lista separada por ',' (vírgulas) ou por ' ' (espaços em branco).",
        ),
      )
      .optional(),
  })
  .extend(BasePaginationDto.baseSchema.shape);

type ListProfessionalsSchema = z.infer<typeof schema>;

export class ListProfessionalsDto extends BasePaginationDto implements ListProfessionalsSchema {
  @Expose()
  @ApiPropertyOptional({
    description: "Filters professionals by including only those with one of selected specialisms.",
    type: "array",
    items: {
      type: "string",
      description: "A recognized professional specialism.",
      enum: Object.values(Professional.Specialism),
    },
  })
  public readonly specialisms!: Professional.Specialism[];

  @Expose()
  @ApiPropertyOptional({
    description:
      "Filters professionals by including only those who include the given query in their names.",
    type: "string",
  })
  public readonly name?: string | undefined;

  protected schema = schema;
}
