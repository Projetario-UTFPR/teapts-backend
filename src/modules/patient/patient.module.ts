import { ProntuarioController } from "@/modules/patient/controllers/prontuario.controller";
import { AddNewDocumentToProntuarioService } from "@/modules/patient/services/add-new-document-to-prontuario.service";
import { SignDocumentUploadUrlService } from "@/modules/patient/services/sign-document-upload-url.service";
import { TherapeuticJourneyModule } from "@/modules/therapeutic-journey/therapeutic-journey.module";
import { Module } from "@nestjs/common";

@Module({
  // when it comes that the therapeutic journey module also needs to import this module,
  // use `forwardRef(() => module)` in both of them to solve this cyclic import issue.
  imports: [TherapeuticJourneyModule],
  providers: [SignDocumentUploadUrlService, AddNewDocumentToProntuarioService],
  controllers: [ProntuarioController],
})
export class PatientModule {}
