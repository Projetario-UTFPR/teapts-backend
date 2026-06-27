import { type SupportContact } from "../value-objects/support-contact.vo";
import { type UUID } from "@/common/uuid";
import { either } from "fp-ts";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { AggregateRoot } from "@/common/entities/aggregate-root";

type PatientProps = {
  accountId: UUID;
  supportContacts: SupportContact[];
};

export class Patient extends AggregateRoot<PatientProps> {
  public static create(props: PatientProps) {
    return either.right(new this(props));
  }

  public static createUnchecked(props: PatientProps) {
    return new this(props);
  }

  public getAccountId() {
    return this._props.accountId;
  }

  public getId() {
    return this._props.accountId;
  }

  public getSupportContacts(): Readonly<SupportContact[]> {
    return [...this._props.supportContacts];
  }

  public putSupportContacts(supportContacts: SupportContact[]) {
    this._props.supportContacts = supportContacts;
  }

  public equals(other: Patient): boolean {
    return this === other || this.getId() === other.getId();
  }

  public belongsToAccount(account: Account | UUID) {
    const accountId = account instanceof Account ? account.getId() : account;
    return this._props.accountId === accountId;
  }
}

export namespace Patient {
  export type Props = PatientProps;
}
