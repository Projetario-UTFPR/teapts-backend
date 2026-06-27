import { PatientsController } from "@/modules/patient/controllers/patients.controller";
import { ProntuarioController } from "@/modules/patient/controllers/prontuario.controller";
import { ListPatientsByProfessionalAccountQueryHandler } from "@/modules/patient/query-handlers/list-patients-by-professional-account.query";
import { ListProntuarioByPatientIdQueryHandler } from "@/modules/patient/query-handlers/list-prontuario-by-patient-id.query";
import { AddNewDocumentToProntuarioService } from "@/modules/patient/services/add-new-document-to-prontuario.service";
import { CreatePatientProfileService } from "@/modules/patient/services/create-patient-profile.service";
import { SignDocumentUploadUrlService } from "@/modules/patient/services/sign-document-upload-url.service";
import { TherapeuticJourneyModule } from "@/modules/therapeutic-journey/therapeutic-journey.module";
import { Module } from "@nestjs/common";

@Module({
  // when it comes that the therapeutic journey module also needs to import this module,
  // use `forwardRef(() => module)` in both of them to solve this cyclic import issue.
  imports: [TherapeuticJourneyModule],
  providers: [
    SignDocumentUploadUrlService,
    AddNewDocumentToProntuarioService,
    ListProntuarioByPatientIdQueryHandler,
    ListPatientsByProfessionalAccountQueryHandler,
    CreatePatientProfileService,
  ],
  controllers: [ProntuarioController, PatientsController],
})
export class PatientModule {}
