import { AggregateRoot } from "../../../common/entities/aggregate-root";
import { type UUID } from "../../../common/uuid";

type MultidisciplinaryTeamProps = {
  id: UUID;
  professionalsIds: UUID[];
  patientId: UUID;
};

export class MultidisciplinaryTeam extends AggregateRoot<MultidisciplinaryTeamProps> {}
