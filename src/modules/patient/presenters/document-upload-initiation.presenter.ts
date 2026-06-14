import { type AsRight } from "@/lib/fp-ts";
import { SignDocumentUploadUrlService } from "@/modules/patient/services/sign-document-upload-url.service";
import { ApiProperty } from "@nestjs/swagger";

type DocumentSignedUrlServiceSuccessResult = AsRight<
  Awaited<ReturnType<typeof SignDocumentUploadUrlService.prototype.execute>>
>;

export class DocumentUploadInitiationPresenter {
  @ApiProperty({
    description: "The URL to upload the actual document. (See AWS S3 documentation for reference.)",
    format: "uri",
  })
  public readonly uploadUrl!: string;

  @ApiProperty({
    description:
      "The 'Key' assigned to the document's file. (See AWS S3 documentation for reference.)",
    example: "019ec291-1ee0-75f9-8cf2-f8bc324664aa-relatorio_multidisciplinar.pdf",
  })
  public readonly fileKey!: string;

  public constructor(props: DocumentUploadInitiationPresenter) {
    Object.assign(this, props);
  }

  public static present({ bucketUrl, fileKey }: DocumentSignedUrlServiceSuccessResult) {
    return new DocumentUploadInitiationPresenter({
      fileKey,
      uploadUrl: bucketUrl,
    });
  }
}
