import { DTO } from "@/infra/http/dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { MIMEType } from "node:util";
import z from "zod";

const TWENTY_MIB = 20 * 2 ** 20;

const schema = z.object({
  fileName: z.string("O nome do arquivo precisa ser um texto."),
  fileSize: z
    .int("O tamanho do arquivo deve ser a quantidade de bytes que ele ocupa. (Um número inteiro.)")
    .positive("O tamanho do arquivo fornecido é inválido.")
    .max(TWENTY_MIB, "O tamanho do arquivo não deve ultrapassar 20 MiB."),
  fileType: z
    .enum(
      [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword", // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      ] as z.util.MimeTypes[],
      {
        error: ({ values }) =>
          "O tipo de arquivo enviado é inválido. São aceito os seguintes formatos: " +
          new Intl.ListFormat("pt-BR").format(values.map((value) => value!.toString())) +
          ".",
      },
    )
    .transform((mimeType) => new MIMEType(mimeType)),
});

type InitiateDocUploadSchema = z.infer<typeof schema>;

export class InitiateDocumentUploadDto extends DTO implements InitiateDocUploadSchema {
  protected schema = schema;

  @ApiProperty({
    description: "The document's file name.",
    example: "relatório multidisciplinar.pdf",
  })
  @Expose()
  public readonly fileName!: string;

  @ApiProperty({
    description:
      "The file's mime type. (See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types.)",
    example: "application/pdf",
    type: "string",
  })
  @Expose()
  public readonly fileType!: MIMEType;

  @ApiProperty({
    description: "The file size (in bytes).",
    example: 1_048_576,
    maximum: TWENTY_MIB,
    minimum: 1,
  })
  @Expose()
  public readonly fileSize!: number;
}
