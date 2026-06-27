import { PtsController } from "@/modules/therapeutic-journey/controllers/pts.controller";
import { ShowActivePtsQueryHandler } from "@/modules/therapeutic-journey/query-handlers/show-active-pts.query";
import { CreateDraftPtsService } from "@/modules/therapeutic-journey/services/create-draft-pts.service";
import { UpdateMultidisciplinaryTeamService } from "@/modules/therapeutic-journey/services/update-multidisciplinary-team.service";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { Module } from "@nestjs/common";
import { CreateActivityService } from "./services/create-activity.service";
import { ActivitiesController } from "@/modules/therapeutic-journey/controllers/activities.controller";
import { VerifyAccountIsAuthorizedAsPatientOrProfessionalService } from "@/modules/therapeutic-journey/services/verify-account-is-authorized-as-patient-or-professional.service";
import { CreateActivePtsTimelineRecordService } from "@/modules/therapeutic-journey/services/create-timeline-record.service";
import { ListActivitiesQueryHandler } from "./query-handlers/list-activities.query";
import { TimelinesController } from "./controllers/timeline.controller";
import { ListTimelineRecordsQueryHandler } from "./query-handlers/list-timeline-records.query";

@Module({
  controllers: [PtsController, ActivitiesController, TimelinesController],
  providers: [
    CreateDraftPtsService,
    VerifyProfessionalIsAuthorizedService,
    VerifyAccountIsAuthorizedAsPatientOrProfessionalService,
    UpdateMultidisciplinaryTeamService,
    ShowActivePtsQueryHandler,
    CreateActivityService,
    CreateActivePtsTimelineRecordService,
    ListActivitiesQueryHandler,
    ListTimelineRecordsQueryHandler,
  ],
  exports: [
    VerifyProfessionalIsAuthorizedService,
    VerifyAccountIsAuthorizedAsPatientOrProfessionalService,
  ],
})
export class TherapeuticJourneyModule {}
