import { SignDocumentUploadUrlService } from "@/modules/patient/services/sign-document-upload-url.service";
import { TherapeuticJourneyModule } from "@/modules/therapeutic-journey/therapeutic-journey.module";
import { Module } from "@nestjs/common";

@Module({
  // when it comes that the therapeutic journey module also needs to import this module,
  // use `forwardRef(() => module)` in both of them to solve this cyclic import issue.
  imports: [TherapeuticJourneyModule],
  providers: [SignDocumentUploadUrlService],
})
export class PatientModule {}
