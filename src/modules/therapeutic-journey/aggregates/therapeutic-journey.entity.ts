import { AggregateRoot } from "@/common/entities/aggregate-root";
import { Professional } from "@/modules/professional/entities/professional.entity";

type TherapeuticJourneyProps = {
  responsibleProfessional: Professional;
  multidisciplinaryTeam: Professional[];
};

export class TherapeuticJourney extends AggregateRoot<TherapeuticJourneyProps> {}
