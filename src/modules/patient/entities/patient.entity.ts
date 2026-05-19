import { BaseEntity } from "@/common/entities/base-entity";
import { type SupportContact } from "../value-objects/support-contact.vo";
import { type UUID } from "@/common/uuid";
import { either } from "fp-ts";

type PatientProps = {
  accountId: UUID;
  supportContacts: SupportContact[];
};

export class Patient extends BaseEntity<PatientProps> {
  public static create(props: PatientProps) {
    return either.right(new this(props));
  }

  public static createUnchecked(props: PatientProps) {
    return new this(props);
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
}

export namespace Patient {
  export type Props = PatientProps;
}
