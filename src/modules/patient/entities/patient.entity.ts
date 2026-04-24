import { BaseEntity } from "@/common/entities/base-entity";
import { type SupportContact } from "../value-objects/support-contact.vo";
import { Account } from "@/modules/identity/entities/account.entity";

type PatientProps = {
  account: Account;
  supportContacts: SupportContact[];
};

export class Patient extends BaseEntity<PatientProps> {
  public getId() {
    return this._props.account.getId();
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
