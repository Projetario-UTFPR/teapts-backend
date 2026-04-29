import { AggregateRoot } from "@/common/entities/aggregate-root";
import { generateUUID, type UUID } from "@/common/uuid";
import { Professional } from "@/modules/professional/entities/professional.aggregate";

type AccountProps = {
  id: UUID;
  name: string;
  email: string;
  passwordHash: string;
  lastUpdatedAt?: Date;
  createdAt: Date;
  professionalProfilesIds: UUID[];
  // wardsIds: UUID[];
};

type AccountConstructorParams = Omit<AccountProps, "id" | "lastUpdatedAt" | "createdAt">;

export class Account extends AggregateRoot<AccountProps> {
  public static create(props: AccountConstructorParams) {
    return new this({ ...props, id: generateUUID(), createdAt: new Date() });
  }

  public static createUnchecked(props: AccountProps) {
    return new this(props);
  }

  public getId() {
    return this._props.id;
  }

  public setName(name: string) {
    this._props.name = name;
    this.touch();
  }

  public getName() {
    return this._props.name;
  }

  public setEmail(email: string) {
    this._props.email = email;
    this.touch();
  }

  public getEmail() {
    return this._props.email;
  }

  public setPasswordHash(newHash: string) {
    this._props.passwordHash = newHash;
    this.touch();
  }

  public getPasswordHash() {
    return this._props.passwordHash;
  }

  public getProfessionalIds() {
    return this._props.professionalProfilesIds;
  }

  public pushProfessionalProfile(professional: Professional) {
    if (this._props.professionalProfilesIds.includes(professional.getId())) return;
    this._props.professionalProfilesIds.push(professional.getId());
    this.touch();
  }

  public removeProfessionalProfile(professional: Professional) {
    const removedIds = (this._props.professionalProfilesIds =
      this._props.professionalProfilesIds.filter((id) => id !== professional.getId()));

    const hasRemovedSomething = removedIds.length !== 0;
    if (hasRemovedSomething) this.touch();
  }

  public equals(other: Account): boolean {
    return this === other || this._props.id === other._props.id;
  }

  private touch() {
    this._props.lastUpdatedAt = new Date();
  }
}
