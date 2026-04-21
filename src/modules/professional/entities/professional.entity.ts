import { BaseEntity } from "@/common/entities/base-entity";
import { type UUID } from "@/common/uuid";
import { Account } from "@/modules/identity/entities/account.entity";

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
