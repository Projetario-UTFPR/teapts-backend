import { AggregateRoot } from "@/common/entities/aggregate-root";
import { generateUUID, type UUID } from "@/common/uuid";
import { Account } from "@/modules/identity/entities/account.aggregate";

type ProfessionalProps = {
  id: UUID;
  accountId: UUID;
  specialism: Professional.Specialism;
};

export class Professional extends AggregateRoot<ProfessionalProps> {
  public static create(props: Omit<ProfessionalProps, "id">) {
    return new this({ ...props, id: generateUUID() });
  }

  public static createUnchecked(props: ProfessionalProps) {
    return new this(props);
  }

  public getId() {
    return this._props.id;
  }

  public getAccountId() {
    return this._props.accountId;
  }

  public getSpecialism() {
    return this._props.specialism;
  }

  public belongsToAccount(account: Account | UUID) {
    const accountId = account instanceof Account ? account.getId() : account;
    return this._props.accountId === accountId;
  }

  public equals(other: Professional): boolean {
    return this._props.id === other._props.id;
  }
}

export namespace Professional {
  export type Props = ProfessionalProps;

  export enum Specialism {
    Doctor = "doctor",
    Psychologist = "psychologist",
    Physiotherapist = "physiotherapist",
  }
}
