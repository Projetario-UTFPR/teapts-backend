import { PtsController } from "@/modules/therapeutic-journey/controllers/pts.controller";
import { CreateDraftPtsService } from "@/modules/therapeutic-journey/services/create-draft-pts.service";
import { VerifyProfessionalIsAuthorizedService } from "@/modules/therapeutic-journey/services/verify-professional-is-authorized.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [PtsController],
  providers: [CreateDraftPtsService, VerifyProfessionalIsAuthorizedService],
  exports: [VerifyProfessionalIsAuthorizedService],
})
export class TherapeuticJourneyModule {}
