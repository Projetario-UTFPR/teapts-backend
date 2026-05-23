import { ProfessionalsController } from "@/modules/professional/controllers/professionals.controller";
import { ListProfessionalsQueryHandler } from "@/modules/professional/query-handlers/list-professionals.query";
import { Module } from "@nestjs/common";

@Module({
  providers: [ListProfessionalsQueryHandler],
  controllers: [ProfessionalsController],
})
export class ProfessionalsModule {}
