import { ApiProperty, ApiPropertyOptional, ApiSchema } from "@nestjs/swagger";
import { Prisma } from "@prisma-gen/client";

@ApiSchema({
  description: "A document from some patient's prontuário.",
})
export class DocumentPresenter {
  @ApiProperty({
    description: "The identifier of this document globally in the system.",
    format: "uuid",
  })
  public readonly id!: string;

  @ApiProperty({ description: "The title given to the document." }) public readonly title!: string;

  @ApiPropertyOptional({
    description: "Explanation or brief details regarding the document's content.",
  })
  public readonly description?: string;

  @ApiProperty({
    description:
      "The URL with which the document can be displayed, accessed and/or download. Whenever it " +
      "could not be generated for some reason, it becomes `null`.",
    format: "uri",
    nullable: true,
  })
  public readonly documentUrl!: string | null;

  @ApiProperty({
    description: "The date and time when this document was registered in the system.",
    format: "date-time",
  })
  public readonly createdAt!: string;

  @ApiPropertyOptional({
    description: "The date and time of the last update of this document in the system.",
    format: "date-time",
  })
  public readonly lastUpdatedAt?: string;

  protected constructor(props: DocumentPresenter) {
    Object.assign(this, props);
  }

  public static present(
    document: Omit<Prisma.DocumentModel, "patientAccountId" | "documentFileKey"> & {
      documentUrl: string | null;
    },
  ) {
    return new DocumentPresenter({
      id: document.id,
      createdAt: new Date(document.createdAt).toISOString(),
      documentUrl: document.documentUrl ?? null,
      title: document.title,
      description: document.description ?? undefined,
      lastUpdatedAt: document.lastUpdatedAt
        ? new Date(document.lastUpdatedAt).toISOString()
        : undefined,
    });
  }
}
