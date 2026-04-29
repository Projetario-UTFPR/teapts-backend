import { AggregateRoot } from "@/common/entities/aggregate-root";
import { type UUID } from "@/common/uuid";

type TherapeuticJourneyProps = {
  responsibleProfessionalId: UUID;
  multidisciplinaryTeamIds: UUID[];
};

export class TherapeuticJourney extends AggregateRoot<TherapeuticJourneyProps> {}
