import { DTO } from "@/infra/http/dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z.object({
  socialSituation: z.string("A situação social do paciente precisa ser um texto."),
});

type Schema = z.infer<typeof schema>;

export class UpdateSocialSituationDto extends DTO implements Schema {
  @Expose()
  @ApiProperty({
    description: "The text containing an analysis of the patient's social situation.",
  })
  public readonly socialSituation!: string;

  protected schema = schema;
}
