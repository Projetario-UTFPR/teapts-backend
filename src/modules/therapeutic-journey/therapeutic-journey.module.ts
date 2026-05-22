import { PtsController } from "@/modules/therapeutic-journey/controllers/pts.controller";
import { CreateDraftPtsService } from "@/modules/therapeutic-journey/services/create-draft-pts.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [PtsController],
  providers: [CreateDraftPtsService],
})
export class TherapeuticJourneyModule {}
