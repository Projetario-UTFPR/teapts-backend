import { type UUID } from "@/common/uuid";
import { DTO } from "@/infra/http/dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import z from "zod";

const schema = z.object({
  assigneeProfessionalId: z
    .uuid("O ID do perfil profissional preisa ser um UUID")
    .transform((id) => id as UUID),
  documentFileKey: z.string(
    "A chave do arquivo deve ser o texto gerado na etapa de iniciação do upload do documento.",
  ),
  documentTitle: z.string("O titulo do documento deve ser um texto."),
  documentDescription: z
    .string("A descrição do documento deve ser um texto.")
    .max(4096, {
      error: ({ maximum }) =>
        `A descrição do documento não deve ultrapassar ${maximum} caracteres.`,
    })
    .optional(),
});

type UploadDocumentSchema = z.infer<typeof schema>;

export class UploadDocumentDto extends DTO implements UploadDocumentSchema {
  protected schema = schema;

  @ApiProperty({
    description:
      "The ID of the professional profile with which the professional is registering the document to the " +
      "patient's prontuário.",
    type: "string",
    format: "uuid",
  })
  @Expose()
  public readonly assigneeProfessionalId!: UUID;

  @ApiProperty({
    description: "The 'fileKey' value generated in the former document upload initiation step.",
    example: "019ec291-1ee0-75f9-8cf2-f8bc324664aa-relatorio_multidisciplinar.pdf",
  })
  @Expose()
  public readonly documentFileKey!: string;

  @ApiProperty({
    description: "The title of the document.",
    example: "Relatório Multidisciplinar",
  })
  @Expose()
  public readonly documentTitle!: string;

  @ApiPropertyOptional({ description: "A description of the document." })
  @Expose()
  public readonly documentDescription!: string;
}
