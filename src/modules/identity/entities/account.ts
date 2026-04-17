import { BaseEntity } from "src/common/entities/base-entity";
import { generateUUID, type UUID } from "src/common/uuid";

type AccountProps = {
  id: UUID;
  name: string;
  email: string;
  passwordHash: string;
  lastUpdatedAt?: Date;
  createdAt: Date;
};

type AccountConstructorParams = Omit<AccountProps, "id" | "lastUpdatedAt" | "createdAt">;

export class Account extends BaseEntity<AccountProps> {
  public static create(props: AccountConstructorParams) {
    return new this({ ...props, id: generateUUID(), createdAt: new Date() });
  }

  public getId() {
    return this._props.id;
  }

  public setName(name: string) {
    this._props.name = name;
  }

  public getName() {
    return this._props.name;
  }

  public setEmail(email: string) {
    this._props.email = email;
  }

  public getEmail() {
    return this._props.email;
  }

  public setPasswordHash(newHash: string) {
    this._props.passwordHash = newHash;
  }

  public getPasswordHash() {
    return this._props.passwordHash;
  }

  public equals(other: Account): boolean {
    return this === other || this._props.id === other._props.id;
  }
}
