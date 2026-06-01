import { SignDocumentUploadUrlService } from "@/modules/patient/services/sign-document-upload-url.service";
import { Module } from "@nestjs/common";

@Module({
  providers: [SignDocumentUploadUrlService],
})
export class PatientModule {}
