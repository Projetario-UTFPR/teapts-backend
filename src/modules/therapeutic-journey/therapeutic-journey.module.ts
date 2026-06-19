import { PtsController } from "@/modules/therapeutic-journey/controllers/pts.controller";
import { ShowActivePtsQueryHandler } from "@/modules/therapeutic-journey/query-handlers/show-active-pts.query";
import { CreateDraftPtsService } from "@/modules/therapeutic-journey/services/create-draft-pts.service";
import { UpdateMultidisciplinaryTeamService } from "@/modules/therapeutic-journey/services/update-multidisciplinary-team.service";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { Module } from "@nestjs/common";
import { CreateActivityService } from "./services/create-activity.service";

@Module({
  controllers: [PtsController],
  providers: [
    CreateDraftPtsService,
    VerifyProfessionalIsAuthorizedService,
    UpdateMultidisciplinaryTeamService,
    ShowActivePtsQueryHandler,
    CreateActivityService,
  ],
  exports: [VerifyProfessionalIsAuthorizedService],
})
export class TherapeuticJourneyModule { }
