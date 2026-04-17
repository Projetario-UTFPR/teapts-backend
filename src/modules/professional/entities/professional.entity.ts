import { BaseEntity } from "src/common/entities/base-entity";
import { type UUID } from "src/common/uuid";
import { Account } from "src/modules/identity/entities/account";

type ProfessionalProps = {
  id: UUID;
  account: Account;
  specialism: Professional.Specialism;
};

export class Professional extends BaseEntity<ProfessionalProps> {
  public equals(other: Professional): boolean {
    return this._props.id === other._props.id;
  }
}

export namespace Professional {
  export enum Specialism {
    Therapist = "therapist",
    Psychologist = "psychologist",
    Psychiatrist = "psychiatrist",
  }
}
