import { AggregateRoot } from "src/common/entities/aggregate-root";
import { type UUID } from "src/common/uuid";

type MultidisciplinaryTeamProps = {
  id: UUID;
  professionalsIds: UUID[];
  patientId: UUID;
};

export class MultidisciplinaryTeam extends AggregateRoot<MultidisciplinaryTeamProps> {}
